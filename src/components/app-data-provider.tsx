"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { backupJobs, tickets } from "@/data/mock-data";
import type { BackupRecord, TicketRecord } from "@/data/mock-data";

interface AppDataContextValue {
  ticketRecords: TicketRecord[];
  backupRecords: BackupRecord[];
  addTicket: (record: TicketRecord) => void;
  updateTicket: (record: TicketRecord) => void;
  deleteTicket: (id: string) => void;
  addBackup: (record: BackupRecord) => void;
  updateBackup: (record: BackupRecord) => void;
  deleteBackup: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [ticketRecords, setTicketRecords] = useState<TicketRecord[]>(tickets);
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>(backupJobs);

  const value = useMemo<AppDataContextValue>(() => ({
    ticketRecords,
    backupRecords,
    addTicket: (record) => setTicketRecords((current) => [record, ...current]),
    updateTicket: (record) => setTicketRecords((current) => current.map((item) => item.id === record.id ? record : item)),
    deleteTicket: (id) => setTicketRecords((current) => current.filter((item) => item.id !== id)),
    addBackup: (record) => setBackupRecords((current) => [record, ...current]),
    updateBackup: (record) => setBackupRecords((current) => current.map((item) => item.id === record.id ? record : item)),
    deleteBackup: (id) => setBackupRecords((current) => current.filter((item) => item.id !== id)),
  }), [ticketRecords, backupRecords]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
