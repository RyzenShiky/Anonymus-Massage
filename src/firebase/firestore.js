import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { app } from "./app.js";

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, arrayUnion,
  writeBatch,
};
