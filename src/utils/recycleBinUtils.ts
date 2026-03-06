import { ref, push, get } from "firebase/database";
import { db } from "@/config/firebase";

export const moveToRecycleBin = async (
  itemId: string,
  type: "customer" | "office" | "materialType" | "dimension" | "thickness" | "job",
  dataPath: string
) => {
  try {
    // Get the item data first
    const itemRef = ref(db, dataPath);
    const snapshot = await get(itemRef);
    const itemData = snapshot.val();

    if (!itemData) {
      throw new Error("Item not found");
    }

    // Add to recycle bin
    const recycleBinRef = ref(db, "recycleBin");
    await push(recycleBinRef, {
      type,
      data: itemData,
      deletedAt: new Date().toISOString(),
      originalPath: dataPath,
    });

    return true;
  } catch (error) {
    console.error("Error moving to recycle bin:", error);
    throw error;
  }
};
