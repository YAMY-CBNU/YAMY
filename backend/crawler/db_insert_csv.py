import os
import csv
import pymysql


# 경로 설정

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

RECIPE_CSV = os.path.join(DATA_DIR, "recipe.csv")
INGREDIENT_CSV = os.path.join(DATA_DIR, "ingredient.csv")
STEP_CSV = os.path.join(DATA_DIR, "step.csv")


# DB 연결

def get_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="gkswjddn",
        database="yamy",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )



def none_if_empty(value):
    if value is None:
        return None

    value = str(value).strip()

    if value == "":
        return None

    return value


def int_or_none(value):
    value = none_if_empty(value)

    if value is None:
        return None

    try:
        return int(value)
    except ValueError:
        return None



# 기존 하위 데이터 삭제
# 중복 실행 시 재료/스텝이 계속 쌓이는 것 방지

def delete_recipe_children(conn, recipe_ids):
    if not recipe_ids:
        return

    with conn.cursor() as cursor:
        placeholders = ",".join(["%s"] * len(recipe_ids))

        cursor.execute(
            f"""
            DELETE FROM RECIPE_INGREDIENT
            WHERE recipe_id IN ({placeholders})
            """,
            recipe_ids
        )

        cursor.execute(
            f"""
            DELETE FROM RECIPE_STEP
            WHERE recipe_id IN ({placeholders})
            """,
            recipe_ids
        )



# RECIPE 저장

def insert_recipes(conn):
    external_ids = []

    with conn.cursor() as cursor:
        with open(RECIPE_CSV, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            for row in reader:
                external_id = none_if_empty(row.get("external_recipe_id"))

                if not external_id:
                    continue

                external_ids.append(external_id)

                cursor.execute(
                    """
                    INSERT INTO RECIPE (
                        external_recipe_id,
                        source_url,
                        title,
                        description,
                        thumbnail_url,
                        difficulty,
                        serving_size,
                        cook_time,
                        cat1_method,
                        cat2_situation,
                        cat3_ingredient,
                        cat4_type,
                        is_external
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                    ON DUPLICATE KEY UPDATE
                        source_url = VALUES(source_url),
                        title = VALUES(title),
                        description = VALUES(description),
                        thumbnail_url = VALUES(thumbnail_url),
                        difficulty = VALUES(difficulty),
                        serving_size = VALUES(serving_size),
                        cook_time = VALUES(cook_time),
                        cat1_method = VALUES(cat1_method),
                        cat2_situation = VALUES(cat2_situation),
                        cat3_ingredient = VALUES(cat3_ingredient),
                        cat4_type = VALUES(cat4_type),
                        is_external = TRUE
                    """,
                    (
                        external_id,
                        none_if_empty(row.get("source_url")),
                        none_if_empty(row.get("title")),
                        none_if_empty(row.get("description")),
                        none_if_empty(row.get("thumbnail_url")),
                        none_if_empty(row.get("difficulty")),
                        none_if_empty(row.get("serving_size")),
                        none_if_empty(row.get("cook_time")),
                        none_if_empty(row.get("cat1_method")),
                        none_if_empty(row.get("cat2_situation")),
                        none_if_empty(row.get("cat3_ingredient")),
                        none_if_empty(row.get("cat4_type")),
                    )
                )

    return external_ids



def get_recipe_id_mapping(conn, external_ids):
    if not external_ids:
        return {}

    mapping = {}

    with conn.cursor() as cursor:
        placeholders = ",".join(["%s"] * len(external_ids))

        cursor.execute(
            f"""
            SELECT recipe_id, external_recipe_id
            FROM RECIPE
            WHERE external_recipe_id IN ({placeholders})
            """,
            external_ids
        )

        for row in cursor.fetchall():
            mapping[str(row["external_recipe_id"])] = row["recipe_id"]

    return mapping



# INGREDIENT 저장

def insert_ingredients(conn, mapping):
    count = 0

    with conn.cursor() as cursor:
        with open(INGREDIENT_CSV, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            for row in reader:
                external_id = none_if_empty(row.get("external_recipe_id"))
                recipe_id = mapping.get(external_id)

                if not recipe_id:
                    continue

                section = none_if_empty(row.get("section")) or "재료"

                if section not in ["재료", "양념", "기타"]:
                    section = "기타"

                name = none_if_empty(row.get("name"))

                if not name:
                    continue

                cursor.execute(
                    """
                    INSERT INTO RECIPE_INGREDIENT (
                        recipe_id,
                        section,
                        name,
                        amount
                    )
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        recipe_id,
                        section,
                        name,
                        none_if_empty(row.get("amount")),
                    )
                )

                count += 1

    return count



# STEP 저장

def insert_steps(conn, mapping):
    count = 0

    with conn.cursor() as cursor:
        with open(STEP_CSV, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            for row in reader:
                external_id = none_if_empty(row.get("external_recipe_id"))
                recipe_id = mapping.get(external_id)

                if not recipe_id:
                    continue

                description = none_if_empty(row.get("description"))

                if not description:
                    continue

                heat_level = none_if_empty(row.get("heat_level"))

                if heat_level not in ["약불", "중불", "강불"]:
                    heat_level = None

                cursor.execute(
                    """
                    INSERT INTO RECIPE_STEP (
                        recipe_id,
                        step_order,
                        description,
                        image_url,
                        heat_level,
                        timer_seconds,
                        tip
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        recipe_id,
                        int_or_none(row.get("step_order")),
                        description,
                        none_if_empty(row.get("image_url")),
                        heat_level,
                        int_or_none(row.get("timer_seconds")),
                        none_if_empty(row.get("tip")),
                    )
                )

                count += 1

    return count



def run():
    conn = get_connection()

    try:
        print("RECIPE 저장 중...")
        external_ids = insert_recipes(conn)

        print("recipe_id 매핑 중...")
        mapping = get_recipe_id_mapping(conn, external_ids)

        print("기존 재료/단계 삭제 중...")
        delete_recipe_children(conn, list(mapping.values()))

        print("INGREDIENT 저장 중...")
        ingredient_count = insert_ingredients(conn, mapping)

        print("STEP 저장 중...")
        step_count = insert_steps(conn, mapping)

        conn.commit()

        print("✅ CSV → MySQL 저장 완료")
        print(f"저장/업데이트한 레시피 수: {len(mapping)}")
        print(f"저장한 재료 수: {ingredient_count}")
        print(f"저장한 조리 단계 수: {step_count}")

    except Exception as e:
        conn.rollback()
        print(f"❌ DB 저장 실패: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    run()