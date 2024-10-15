"use client";

import { useState } from "react";
import AdvancedSyncedPlayer from "@/components/advanced-synced-player";
import Dashboard from "@/components/dashboard";
import HowlerPlayer from "@/components/howler-player";

export default function Home() {
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(
    undefined
  );

  const handleGoToPlayer = (fileName?: string) => {
    setShowPlayer(true);
    setSelectedFile(fileName);
  };

  return (
    <main>
      {/* {showPlayer ? (
        <AdvancedSyncedPlayer selectedFile={selectedFile} onBackToDashboard={() => setShowPlayer(false)} />
      ) : (
        <Dashboard onGoToPlayer={handleGoToPlayer} />
      )} */}

      <HowlerPlayer />
    </main>
  );
}
