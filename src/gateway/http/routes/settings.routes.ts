/**
 * Settings Routes
 * Configuration management endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { getConfig } from '../../../config/config';

export const settingsRouter = Router();

// Zod schemas for validation
const SearchSettingsSchema = z.object({
  preferred_provider: z.string().optional(),
  search_rigor: z.string().optional(),
  tavily_api_key: z.string().optional(),
  google_api_key: z.string().optional(),
  google_cx: z.string().optional(),
  brave_api_key: z.string().optional(),
});

const PathsSettingsSchema = z.object({
  workspace_path: z.string().optional(),
  allowed_paths: z.array(z.string()).optional(),
  blocked_paths: z.array(z.string()).optional(),
});

const AgentPolicySettingsSchema = z.object({
  force_web_for_fresh: z.boolean().optional(),
  memory_fallback_on_search_failure: z.boolean().optional(),
  auto_store_web_facts: z.boolean().optional(),
  natural_language_tool_router: z.boolean().optional(),
  retrieval_mode: z.string().optional(),
});

const ThinkingSettingsSchema = z.object({
  enabled: z.boolean().optional(),
});

const ModelSettingsSchema = z.object({
  primary: z.string().optional(),
  roles: z.record(z.string()).optional(),
  ollama_endpoint: z.string().optional(),
});

/**
 * GET /api/settings/search
 * Get search configuration
 */
settingsRouter.get('/search', (_req, res) => {
  const cfg = (getConfig().getConfig() as any).search || {};
  res.json({
    preferred_provider: cfg.preferred_provider || 'tavily',
    search_rigor: cfg.search_rigor || 'verified',
    tavily_api_key: cfg.tavily_api_key || '',
    google_api_key: cfg.google_api_key || '',
    google_cx: cfg.google_cx || '',
    brave_api_key: cfg.brave_api_key || '',
  });
});

/**
 * POST /api/settings/search
 * Update search configuration
 */
settingsRouter.post('/search', (req, res) => {
  const parseResult = SearchSettingsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid settings', details: parseResult.error.flatten() });
    return;
  }

  const { preferred_provider, search_rigor, tavily_api_key, google_api_key, google_cx, brave_api_key } = parseResult.data;
  const cm = getConfig();
  const current = cm.getConfig() as any;
  const newSearch = {
    ...((current.search || {})),
    ...(preferred_provider !== undefined && { preferred_provider }),
    ...(search_rigor !== undefined && { search_rigor }),
    ...(tavily_api_key !== undefined && { tavily_api_key }),
    ...(google_api_key !== undefined && { google_api_key }),
    ...(google_cx !== undefined && { google_cx }),
    ...(brave_api_key !== undefined && { brave_api_key }),
  };
  cm.updateConfig({ search: newSearch } as any);
  res.json({ success: true });
});

/**
 * GET /api/settings/paths
 * Get workspace and path configuration
 */
settingsRouter.get('/paths', (_req, res) => {
  const cfg = getConfig().getConfig();
  res.json({
    workspace_path: (cfg as any).workspace?.path || '',
    allowed_paths: (cfg as any).tools?.permissions?.files?.allowed_paths || [],
    blocked_paths: (cfg as any).tools?.permissions?.files?.blocked_paths || [],
  });
});

/**
 * POST /api/settings/paths
 * Update workspace and path configuration
 */
settingsRouter.post('/paths', (req, res) => {
  const parseResult = PathsSettingsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid settings', details: parseResult.error.flatten() });
    return;
  }

  const { workspace_path, allowed_paths, blocked_paths } = parseResult.data;
  const cm = getConfig();
  const current = cm.getConfig() as any;
  const tools = {
    ...current.tools,
    permissions: {
      ...current.tools?.permissions,
      files: {
        ...(current.tools?.permissions?.files || {}),
        ...(Array.isArray(allowed_paths) && { allowed_paths }),
        ...(Array.isArray(blocked_paths) && { blocked_paths }),
      },
    },
  };
  const workspacePath = typeof workspace_path === 'string' ? workspace_path.trim() : '';
  if (workspacePath) {
    try { fs.mkdirSync(workspacePath, { recursive: true }); } catch { }
  }
  cm.updateConfig({
    tools,
    ...(workspacePath ? { workspace: { ...(current.workspace || {}), path: workspacePath } } : {}),
  } as any);
  res.json({ success: true });
});

/**
 * GET /api/settings/agent
 * Get agent policy configuration
 */
settingsRouter.get('/agent', (_req, res) => {
  const cfg = (getConfig().getConfig() as any).agent_policy || {};
  res.json({
    force_web_for_fresh: cfg.force_web_for_fresh !== false,
    memory_fallback_on_search_failure: cfg.memory_fallback_on_search_failure !== false,
    auto_store_web_facts: cfg.auto_store_web_facts !== false,
    natural_language_tool_router: cfg.natural_language_tool_router !== false,
    retrieval_mode: cfg.retrieval_mode || 'standard',
  });
});

/**
 * POST /api/settings/agent
 * Update agent policy configuration
 */
settingsRouter.post('/agent', (req, res) => {
  const parseResult = AgentPolicySettingsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid settings', details: parseResult.error.flatten() });
    return;
  }

  const { force_web_for_fresh, memory_fallback_on_search_failure, auto_store_web_facts, natural_language_tool_router, retrieval_mode } = parseResult.data;
  const cm = getConfig();
  const current = cm.getConfig() as any;
  const newPolicy = {
    ...(current.agent_policy || {}),
    ...(force_web_for_fresh !== undefined && { force_web_for_fresh }),
    ...(memory_fallback_on_search_failure !== undefined && { memory_fallback_on_search_failure }),
    ...(auto_store_web_facts !== undefined && { auto_store_web_facts }),
    ...(natural_language_tool_router !== undefined && { natural_language_tool_router }),
    ...(retrieval_mode !== undefined && { retrieval_mode }),
  };
  cm.updateConfig({ agent_policy: newPolicy } as any);
  res.json({ success: true });
});

/**
 * GET /api/settings/thinking
 * Get thinking mode configuration
 */
settingsRouter.get('/thinking', (_req, res) => {
  const cfg = getConfig().getConfig();
  res.json({ success: true, enabled: cfg.ollama?.thinking_enabled !== false });
});

/**
 * POST /api/settings/thinking
 * Update thinking mode configuration
 */
settingsRouter.post('/thinking', (req, res) => {
  const parseResult = ThinkingSettingsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid settings', details: parseResult.error.flatten() });
    return;
  }

  const { enabled } = parseResult.data;
  const cm = getConfig();
  const current = cm.getConfig();
  const ollama = (current as any).ollama || {};
  cm.updateConfig({
    ollama: { ...ollama, thinking_enabled: !!enabled }
  } as any);
  res.json({ success: true });
});

/**
 * GET /api/settings/model
 * Get model configuration
 */
settingsRouter.get('/model', (_req, res) => {
  const cfg = getConfig().getConfig();
  res.json({
    primary: cfg.models?.primary,
    roles: cfg.models?.roles,
    ollama_endpoint: (cfg as any).ollama?.endpoint || 'http://localhost:11434',
  });
});

/**
 * POST /api/settings/model
 * Update model configuration
 */
settingsRouter.post('/model', (req, res) => {
  const parseResult = ModelSettingsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid settings', details: parseResult.error.flatten() });
    return;
  }

  const { primary, roles, ollama_endpoint } = parseResult.data;
  const cm = getConfig();
  const current = cm.getConfig();
  if (primary || roles) {
    cm.updateConfig({
      models: {
        primary: primary || current.models?.primary,
        roles: { ...(current.models?.roles || {}), ...(roles || {}) },
      }
    });
  }
  if (ollama_endpoint) {
    cm.updateConfig({
      ollama: { ...((current as any).ollama || {}), endpoint: ollama_endpoint }
    } as any);
  }
  res.json({ success: true, model: getConfig().getConfig().models?.primary });
});
