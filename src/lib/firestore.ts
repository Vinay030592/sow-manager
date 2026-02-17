import { collection, doc, setDoc, deleteDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import type { SOW } from "./types";

const COLLECTION_NAME = "sows";

export async function saveSow(sow: SOW): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, sow.id);
  await setDoc(docRef, sow);
}

export async function deleteSow(sowId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, sowId);
  await deleteDoc(docRef);
}

export function subscribeSows(callback: (sows: SOW[]) => void): Unsubscribe {
  const colRef = collection(db, COLLECTION_NAME);
  return onSnapshot(colRef, (snapshot) => {
    const sows: SOW[] = snapshot.docs.map((doc) => doc.data() as SOW);
    callback(sows);
  });
}
