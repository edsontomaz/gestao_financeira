import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/contexts/profile-context";
import { profiles, profileLabels } from "@shared/schema";
import { User, ChevronDown } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export function ProfileSelector() {
  const { profile, setProfile, profileLabel } = useProfile();

  const handleProfileChange = (newProfile: typeof profiles[number]) => {
    setProfile(newProfile);
    queryClient.invalidateQueries();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-profile-selector">
          <User className="h-4 w-4" />
          <span>{profileLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {profiles.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => handleProfileChange(p)}
            className={profile === p ? "bg-accent" : ""}
            data-testid={`menu-profile-${p}`}
          >
            {profileLabels[p]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
