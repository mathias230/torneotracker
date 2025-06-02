"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamManagement from "@/components/TeamManagement";
import GroupStageManagement from "@/components/GroupStageManagement";
import KnockoutStageManagement from "@/components/KnockoutStageManagement";
import { Users, ListChecks, GitFork } from 'lucide-react';
import { useIsClient } from "@/components/TournamentContext";

export default function HomePage() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-xl text-muted-foreground">Loading Tournament Tracker...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 shadow-sm">
          <TabsTrigger value="teams" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <Users className="mr-2 h-5 w-5" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="group_stage" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <ListChecks className="mr-2 h-5 w-5" />
            Group Stage
          </TabsTrigger>
          <TabsTrigger value="knockout_stage" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <GitFork className="mr-2 h-5 w-5" />
            Knockout Stage
          </TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="mt-2">
          <TeamManagement />
        </TabsContent>
        <TabsContent value="group_stage" className="mt-2">
          <GroupStageManagement />
        </TabsContent>
        <TabsContent value="knockout_stage" className="mt-2">
          <KnockoutStageManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
