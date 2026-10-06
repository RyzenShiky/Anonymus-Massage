import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { app } from "./app.js";

export const db = getFirestore(app);
export {
  doc, getDoc, setDoc, updateDoc, collection, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, arrayUnion,
};
