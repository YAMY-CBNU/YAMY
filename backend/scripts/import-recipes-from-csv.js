const fs = require('fs/promises');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const recipesStore = require('../storage/recipesStore');
const INGREDIENT_SECTIONS = new Set(['재료', '양념', '기타']);
const HEAT_LEVELS = new Set(['약불', '중불', '강불']);

const REQUIRED_HEADERS = {
  recipe: [
    'external_recipe_id',
    'source_url',
    'title',
    'description',
    'thumbnail_url',
    'difficulty',
    'serving_size',
    'cook_time',
    'cat1_method',
    'cat2_situation',
    'cat3_ingredient',
    'cat4_type',
  ],
  ingredient: ['external_recipe_id', 'section', 'name', 'amount'],
  step: [
    'external_recipe_id',
    'step_order',
    'description',
    'image_url',
    'heat_level',
    'timer_seconds',
    'tip',
  ],
};

function parseArguments(argv) {
  const options = {
    csvDir: path.resolve(__dirname, '..', '..', '..'),
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (argument === '--csv-dir') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--csv-dir requires a directory path.');
      }
      options.csvDir = path.resolve(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('CSV contains an unterminated quoted field.');
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  const headers = rows[0];

  return rows.slice(1)
    .filter((values) => values.some((value) => value !== ''))
    .map((values, rowIndex) => {
      if (values.length !== headers.length) {
        throw new Error(
          `CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}.`
        );
      }

      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
}

function assertHeaders(rows, requiredHeaders, fileName) {
  if (rows.length === 0) {
    throw new Error(`${fileName} has no data rows.`);
  }

  const headers = new Set(Object.keys(rows[0]));
  const missing = requiredHeaders.filter((header) => !headers.has(header));

  if (missing.length > 0) {
    throw new Error(`${fileName} is missing columns: ${missing.join(', ')}`);
  }
}

function text(value) {
  return String(value ?? '').trim();
}

function nullableText(value) {
  return text(value) || null;
}

function positiveInteger(value, label) {
  const parsed = Number(text(value));
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function nullableNonNegativeInteger(value, label) {
  const normalized = text(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer or blank.`);
  }
  return parsed;
}

async function readCsv(csvDir, baseName) {
  const filePath = path.join(csvDir, `${baseName}.csv`);
  const contents = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(contents);
  assertHeaders(rows, REQUIRED_HEADERS[baseName], `${baseName}.csv`);
  return rows;
}

function groupRowsByRecipeId(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const recipeId = text(row.external_recipe_id);
    if (!grouped.has(recipeId)) grouped.set(recipeId, []);
    grouped.get(recipeId).push(row);
  }

  return grouped;
}

function buildImportRecords(recipeRows, ingredientRows, stepRows) {
  const ingredientsByRecipe = groupRowsByRecipeId(ingredientRows);
  const stepsByRecipe = groupRowsByRecipeId(stepRows);
  const recipeIds = new Set();

  const recipes = recipeRows.map((row, rowIndex) => {
    const externalRecipeId = text(row.external_recipe_id);
    if (!externalRecipeId) {
      throw new Error(`recipe.csv row ${rowIndex + 2} has no external_recipe_id.`);
    }
    if (recipeIds.has(externalRecipeId)) {
      throw new Error(`recipe.csv contains duplicate external_recipe_id ${externalRecipeId}.`);
    }
    recipeIds.add(externalRecipeId);

    const title = text(row.title);
    if (!title) {
      throw new Error(`Recipe ${externalRecipeId} has no title.`);
    }

    const ingredients = (ingredientsByRecipe.get(externalRecipeId) || []).map((ingredient) => {
      const section = nullableText(ingredient.section) || '재료';
      if (!INGREDIENT_SECTIONS.has(section)) {
        throw new Error(`Recipe ${externalRecipeId} has invalid ingredient section ${section}.`);
      }

      return {
        section,
        name: text(ingredient.name),
        amount: nullableText(ingredient.amount),
      };
    });

    if (ingredients.some((ingredient) => !ingredient.name)) {
      throw new Error(`Recipe ${externalRecipeId} contains an ingredient with no name.`);
    }

    const steps = (stepsByRecipe.get(externalRecipeId) || [])
      .map((step) => {
        const heatLevel = nullableText(step.heat_level);
        if (heatLevel && !HEAT_LEVELS.has(heatLevel)) {
          throw new Error(`Recipe ${externalRecipeId} has invalid heat level ${heatLevel}.`);
        }

        return {
          order: positiveInteger(
            step.step_order,
            `Recipe ${externalRecipeId} step_order`
          ),
          description: text(step.description),
          imageUrl: nullableText(step.image_url),
          heatLevel,
          timerSeconds: nullableNonNegativeInteger(
            step.timer_seconds,
            `Recipe ${externalRecipeId} timer_seconds`
          ),
          tip: nullableText(step.tip),
        };
      })
      .sort((left, right) => left.order - right.order);

    if (steps.some((step) => !step.description)) {
      throw new Error(`Recipe ${externalRecipeId} contains a step with no description.`);
    }

    return {
      externalRecipeId,
      sourceUrl: nullableText(row.source_url),
      title,
      description: nullableText(row.description),
      thumbnailUrl: nullableText(row.thumbnail_url),
      difficulty: nullableText(row.difficulty),
      servingSize: nullableText(row.serving_size),
      cookTime: nullableText(row.cook_time),
      categories: {
        method: nullableText(row.cat1_method),
        situation: nullableText(row.cat2_situation),
        mainIngredient: nullableText(row.cat3_ingredient),
        type: nullableText(row.cat4_type),
      },
      ingredients,
      steps,
    };
  });

  for (const recipeId of [...ingredientsByRecipe.keys(), ...stepsByRecipe.keys()]) {
    if (!recipeIds.has(recipeId)) {
      throw new Error(`Child CSV row references unknown recipe ${recipeId}.`);
    }
  }

  return recipes;
}

function summarize(recipes) {
  return {
    recipes: recipes.length,
    ingredients: recipes.reduce((total, recipe) => total + recipe.ingredients.length, 0),
    steps: recipes.reduce((total, recipe) => total + recipe.steps.length, 0),
    recipesWithoutSteps: recipes.filter((recipe) => recipe.steps.length === 0).length,
    recipesWithoutCategories: recipes.filter((recipe) => (
      Object.values(recipe.categories).every((category) => !category)
    )).length,
    missingDescription: recipes.filter((recipe) => !recipe.description).length,
    missingDifficulty: recipes.filter((recipe) => !recipe.difficulty).length,
    missingServingSize: recipes.filter((recipe) => !recipe.servingSize).length,
    missingCookTime: recipes.filter((recipe) => !recipe.cookTime).length,
    stepsWithHeatLevel: recipes.reduce(
      (total, recipe) => total + recipe.steps.filter((step) => step.heatLevel).length,
      0
    ),
    stepsWithTimer: recipes.reduce(
      (total, recipe) => total + recipe.steps.filter((step) => step.timerSeconds !== null).length,
      0
    ),
  };
}

async function loadImportRecords(csvDir) {
  const [recipeRows, ingredientRows, stepRows] = await Promise.all([
    readCsv(csvDir, 'recipe'),
    readCsv(csvDir, 'ingredient'),
    readCsv(csvDir, 'step'),
  ]);

  return buildImportRecords(recipeRows, ingredientRows, stepRows);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const recipes = await loadImportRecords(options.csvDir);
  const summary = summarize(recipes);

  console.log('CSV validation completed.');
  console.table(summary);

  if (options.dryRun) {
    console.log('Dry run only; no recipes were saved.');
    return;
  }

  const result = await recipesStore.importExternalRecipes(recipes);
  console.log(
    `Import completed in ${result.mode} mode: `
    + `${result.created} created, ${result.updated} updated, ${result.total} total.`
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(`Recipe import failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      const mysqlPool = require('../config/db');
      await mysqlPool.end();
    });
}

module.exports = {
  parseCsv,
  buildImportRecords,
  loadImportRecords,
  summarize,
};
