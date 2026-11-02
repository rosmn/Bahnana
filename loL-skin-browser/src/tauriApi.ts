// Tauri API Layer - Replaces direct fetch calls with Tauri invoke

import { invoke } from '@tauri-apps/api/core';
import type { SkinCatalog, DownloadedSkin, SkinMetadata, ChampionCatalogEntry, ChromaMetadata } from './types';

// Tauri command result type
interface IpcResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const result = await invoke<IpcResult<T>>(command, args);
  if (!result.ok) {
    throw new Error(result.error || `Command ${command} failed`);
  }
  return result.value as T;
}

// Skin catalog operations
export async function fetchSkinCatalog(): Promise<SkinCatalog> {
  return invokeCommand<SkinCatalog>('fetch_skin_catalog');
}

export async function getSkinCatalog(): Promise<SkinCatalog | null> {
  return invokeCommand<SkinCatalog | null>('get_skin_catalog');
}

// Skin download operations
export interface DownloadSkinArgs {
  skinId: string;
  [key: string]: unknown;
}

export async function downloadSkin(args: DownloadSkinArgs): Promise<DownloadedSkin> {
  return invokeCommand<DownloadedSkin>('download_skin', args);
}

// Skin application
export interface ApplySkinArgs {
  skinId: string;
  [key: string]: unknown;
}

export async function applySkin(args: ApplySkinArgs): Promise<void> {
  return invokeCommand<void>('apply_skin', args);
}

// Skin removal
export interface RemoveSkinArgs {
  skinId: string;
  [key: string]: unknown;
}

export async function removeSkin(args: RemoveSkinArgs): Promise<void> {
  return invokeCommand<void>('remove_skin', args);
}

// List downloaded skins
export async function listDownloadedSkins(): Promise<DownloadedSkin[]> {
  return invokeCommand<DownloadedSkin[]>('list_downloaded_skins');
}

// Re-export types for convenience
export type { SkinCatalog, DownloadedSkin, SkinMetadata, ChampionCatalogEntry, ChromaMetadata };