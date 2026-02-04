import { useProfile } from "@/contexts/profile-context";

export function useProfileQueryParams() {
  const { profile } = useProfile();
  return `?profile=${profile}`;
}

export function buildProfileUrl(baseUrl: string, profile: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}profile=${profile}`;
}
