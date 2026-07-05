/* ============================================================
   board.js — 게시판/댓글/대댓글/조회수/파일업로드/검색 통합 엔진
============================================================ */

import { db, storage } from "/firebase-init.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

/* ============================================================
   비밀번호 해시 (CDN sha256)
============================================================ */
export function hashPassword(pw) {
  return sha256(pw || "");
}

export function verifyPassword(inputPw, storedHash) {
  return hashPassword(inputPw) === storedHash;
}

/* ============================================================
   카테고리 이름 (breadcrumb용)
============================================================ */
export function getCategoryName(cat) {
  const map = {
    "notice": "공지사항",
    "news": "뉴스",
    "event": "이벤트",
    "resource": "자료실",
    "case": "판례"
  };
  return map[cat] || "전체";
}

/* ============================================================
   게시물 번호 자동 증가
============================================================ */
export async function getNextPostId() {
  const snap = await getDocs(collection(db, "posts"));
  let max = 0;
  snap.forEach(d => {
    const p = d.data();
    if (p.postId > max) max = p.postId;
  });
  return max + 1;
}

/* ============================================================
   댓글 번호 자동 증가
============================================================ */
export async function getNextCommentId() {
  const snap = await getDocs(collection(db, "comments"));
  let max = 0;
  snap.forEach(d => {
    const c = d.data();
    if (c.commentId > max) max = c.commentId;
  });
  return max + 1;
}

/* ============================================================
   파일 업로드
============================================================ */
export async function uploadFile(file) {
  if (!file) return null;

  const filePath = `resources/${Date.now()}_${file.name}`;
  const fileRef = storageRef(storage, filePath);

  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

/* ============================================================
   게시물 저장
============================================================ */
export async function savePost({ category, title, content, password, file }, editId = null) {
  const now = new Date();
  const hashedPw = hashPassword(password);

  let fileUrl = null;
  if (file) fileUrl = await uploadFile(file);

  if (editId) {
    const ref = doc(db, "posts", editId);
    const old = await getDoc(ref);
    const prev = old.data();

    await updateDoc(ref, {
      category,
      title,
      content,
      fileUrl: fileUrl || prev.fileUrl || null,
      updatedAt: now
    });

    return editId;
  }

  const postId = await getNextPostId();
  const ref = doc(db, "posts", String(postId));

  await setDoc(ref, {
    postId,
    category,
    title,
    content,
    password: hashedPw,
    fileUrl: fileUrl || null,
    createdAt: now,
    updatedAt: now,
    views: 0
  });

  return String(postId);
}

/* ============================================================
   게시물 로드 + 조회수 증가
============================================================ */
export async function loadPost(id, increaseView = true) {
  const ref = doc(db, "posts", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  if (increaseView) {
    await updateDoc(ref, { views: increment(1) });
  }

  return { id: snap.id, ...snap.data() };
}

/* ============================================================
   게시물 삭제
============================================================ */
export async function deletePost(id, inputPw) {
  const ref = doc(db, "posts", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("NOT_FOUND");

  const post = snap.data();
  if (!verifyPassword(inputPw, post.password)) {
    throw new Error("WRONG_PASSWORD");
  }

  await deleteDoc(ref);

  // 댓글도 함께 삭제
  const cSnap = await getDocs(query(collection(db, "comments"), where("postId", "==", id)));
  const deletes = cSnap.docs.map(d => deleteDoc(doc(db, "comments", d.id)));
  await Promise.all(deletes);

  return true;
}

/* ============================================================
   게시물 목록 로드
============================================================ */
export async function loadPostList() {
  const snap = await getDocs(collection(db, "posts"));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => b.postId - a.postId);
}

/* ============================================================
   카테고리 필터링
============================================================ */
export function filterByCategory(posts, category) {
  if (!category) return posts;
  return posts.filter(p => p.category === category);
}

/* ============================================================
   댓글 로드 (대댓글 포함)
============================================================ */
export async function loadComments(postId) {
  const snap = await getDocs(
    query(collection(db, "comments"), where("postId", "==", postId), orderBy("commentId", "asc"))
  );

  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const tree = [];
  const map = {};

  list.forEach(c => {
    map[c.commentId] = { ...c, replies: [] };
  });

  list.forEach(c => {
    if (c.parentId) {
      map[c.parentId].replies.push(map[c.commentId]);
    } else {
      tree.push(map[c.commentId]);
    }
  });

  return tree;
}

/* ============================================================
   댓글 추가
============================================================ */
export async function addComment(postId, { user, text, password, parentId = null }) {
  const commentId = await getNextCommentId();
  const now = new Date();

  const ref = doc(db, "comments", String(commentId));
  await setDoc(ref, {
    postId,
    commentId,
    parentId,
    user,
    text,
    password: hashPassword(password),
    createdAt: now
  });

  return String(commentId);
}

/* ============================================================
   댓글 삭제
============================================================ */
export async function deleteComment(commentId, inputPw) {
  const ref = doc(db, "comments", commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("NOT_FOUND");

  const c = snap.data();
  if (!verifyPassword(inputPw, c.password)) {
    throw new Error("WRONG_PASSWORD");
  }

  await deleteDoc(ref);
  return true;
}

/* ============================================================
   검색
============================================================ */
export async function searchPosts(keyword) {
  const q = (keyword || "").toLowerCase();
  const snap = await getDocs(collection(db, "posts"));

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.content || "").toLowerCase().includes(q)
    );
}

export async function searchComments(keyword) {
  const q = (keyword || "").toLowerCase();
  const snap = await getDocs(collection(db, "comments"));

  return snap.docs
    .map(d => ({ id:
