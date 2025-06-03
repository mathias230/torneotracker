
"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamManagement from "@/components/TeamManagement";
import GroupStageManagement from "@/components/GroupStageManagement";
import KnockoutStageManagement from "@/components/KnockoutStageManagement";
import LeagueManagement from "@/components/LeagueManagement";
import { Users, ListChecks, GitFork, ClipboardList } from 'lucide-react';
import { useIsClient } from "@/components/TournamentContext";

export default function HomePage() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-xl text-muted-foreground">Cargando Gestor de Torneos...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-1 xs:grid-cols-2 md:grid-cols-4 mb-6 xs:mb-4 md:mb-2 shadow-sm gap-1.5 sm:gap-2">
          <TabsTrigger value="teams" className="py-2.5 sm:py-3 text-[10px] xs:text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <Users className="mr-1 h-3.5 w-3.5 xs:mr-1.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            Gestión de Equipos
          </TabsTrigger>
          <TabsTrigger value="league" className="py-2.5 sm:py-3 text-[10px] xs:text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <ClipboardList className="mr-1 h-3.5 w-3.5 xs:mr-1.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            Liga
          </TabsTrigger>
          <TabsTrigger value="group_stage" className="py-2.5 sm:py-3 text-[10px] xs:text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <ListChecks className="mr-1 h-3.5 w-3.5 xs:mr-1.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            Fase de Grupos
          </TabsTrigger>
          <TabsTrigger value="knockout_stage" className="py-2.5 sm:py-3 text-[10px] xs:text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <GitFork className="mr-1 h-3.5 w-3.5 xs:mr-1.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            Fase Eliminatoria
          </TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="relative">
          <TeamManagement />
        </TabsContent>
        <TabsContent value="league" className="relative">
          <LeagueManagement />
        </TabsContent>
        <TabsContent value="group_stage" className="relative">
          <GroupStageManagement />
        </TabsContent>
        <TabsContent value="knockout_stage" className="relative">
          <KnockoutStageManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

