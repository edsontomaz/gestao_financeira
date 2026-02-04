import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Profile, profiles, profileLabels } from "@shared/schema";

interface ProfileContextType {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  profileLabel: string;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = "finance-app-profile";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && profiles.includes(stored as Profile)) {
        return stored as Profile;
      }
    }
    return "edson";
  });

  const setProfile = (newProfile: Profile) => {
    setProfileState(newProfile);
    localStorage.setItem(STORAGE_KEY, newProfile);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profile);
  }, [profile]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, profileLabel: profileLabels[profile] }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
