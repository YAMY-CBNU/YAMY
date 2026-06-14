const recipesStore = require('../storage/recipesStore');
const commentsStore = require('../storage/commentsStore');
const { requireAuth } = require('../utils/auth');

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`올바른 ${label} ID가 아닙니다.`);
    error.status = 400;
    throw error;
  }
  return id;
}

function normalizeContent(value) {
  const content = String(value ?? '').trim();
  if (!content) {
    const error = new Error('댓글 내용을 입력해 주세요.');
    error.status = 400;
    throw error;
  }
  if (content.length > 1000) {
    const error = new Error('댓글은 1000자 이내로 입력해 주세요.');
    error.status = 400;
    throw error;
  }
  return content;
}

async function requirePublishedRecipe(recipeId) {
  const recipe = await recipesStore.findRecipeById(recipeId);
  if (!recipe || recipe.status !== 'published') {
    const error = new Error('레시피를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
}

async function requireManageableComment(commentId, recipeId, auth) {
  const comment = await commentsStore.findById(commentId);
  if (!comment || Number(comment.recipeId) !== Number(recipeId)) {
    const error = new Error('댓글을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
  if (
    auth.role !== 'admin'
    && Number(comment.author.id) !== Number(auth.userId)
  ) {
    const error = new Error('자신이 작성한 댓글만 수정하거나 삭제할 수 있습니다.');
    error.status = 403;
    throw error;
  }
}

function sendError(res, error, context) {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(context, error);
  return res.status(500).json({ message: '댓글 처리 중 오류가 발생했습니다.' });
}

exports.listComments = async (req, res) => {
  try {
    const recipeId = parseId(req.params.recipeId, '레시피');
    await requirePublishedRecipe(recipeId);
    const comments = await commentsStore.listByRecipe(recipeId);
    return res.status(200).json({ comments, count: comments.length });
  } catch (error) {
    return sendError(res, error, 'List comments error:');
  }
};

exports.createComment = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseId(req.params.recipeId, '레시피');
    await requirePublishedRecipe(recipeId);
    const comment = await commentsStore.createComment({
      recipeId,
      userId: auth.userId,
      content: normalizeContent(req.body.content),
    });
    return res.status(201).json({ message: '댓글이 등록되었습니다.', comment });
  } catch (error) {
    return sendError(res, error, 'Create comment error:');
  }
};

exports.updateComment = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseId(req.params.recipeId, '레시피');
    const commentId = parseId(req.params.commentId, '댓글');
    await requireManageableComment(commentId, recipeId, auth);
    const comment = await commentsStore.updateComment(
      commentId,
      normalizeContent(req.body.content)
    );
    return res.status(200).json({ message: '댓글이 수정되었습니다.', comment });
  } catch (error) {
    return sendError(res, error, 'Update comment error:');
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const auth = requireAuth(req);
    const recipeId = parseId(req.params.recipeId, '레시피');
    const commentId = parseId(req.params.commentId, '댓글');
    await requireManageableComment(commentId, recipeId, auth);
    await commentsStore.deleteComment(commentId);
    return res.status(200).json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    return sendError(res, error, 'Delete comment error:');
  }
};
