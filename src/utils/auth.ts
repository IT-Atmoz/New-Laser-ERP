import { ref, get, set } from "firebase/database";
import { db } from "@/config/firebase";

export type UserRole = "admin" | "user";

export const setupUsers = async () => {
  const users = [
    { username: "admin123", password: "admin123@@#", role: "admin" as UserRole },
    { username: "lokesh", password: "lok123", role: "admin" as UserRole },
  ];
  for (const user of users) {
    await set(ref(db, `users/${user.username}`), {
      password: user.password,
      role: user.role,
    });
  }
};

export const login = async (username: string, password: string): Promise<boolean> => {
  try {
    const snap = await get(ref(db, `users/${username}`));
    const user = snap.val();
    if (user && user.password === password) {
      localStorage.setItem("loggedIn", "yes");
      localStorage.setItem("userRole", user.role);
      localStorage.setItem("username", username);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const logout = (): void => {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userRole");
  localStorage.removeItem("username");
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem("loggedIn") === "yes";
};

export const getUserRole = (): UserRole => {
  return (localStorage.getItem("userRole") as UserRole) || "user";
};

export const isAdmin = (): boolean => {
  return getUserRole() === "admin";
};

export const getUsername = (): string => {
  return localStorage.getItem("username") || "";
};
