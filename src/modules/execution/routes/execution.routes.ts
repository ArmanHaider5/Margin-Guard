/**
 * Execution Routes
 * 
 * API endpoints for execution-phase operations.
 * Mounted under /api/execution
 * 
 * ISOLATION: Does NOT modify existing analysis routes.
 */

import express from "express";
import { generateExecutionFromRootCause } from "../services/ExecutionGenerator";

const router = express.Router();

router.post("/generate", async (req, res) => {
  const { rootCauseId, rootCauseTitle } = req.body;

  const executionPack = generateExecutionFromRootCause(
    rootCauseId,
    rootCauseTitle
  );

  res.json(executionPack);
});

export default router;
