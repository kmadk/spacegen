#!/usr/bin/env node
import { Command } from "commander";
import { loadIR, saveIR, canonicalize, validateIR, irHash } from "@fir/ir";
import schema from "@fir/ir/schema.json" assert { type: "json" };
import { lintCompat } from "@fir/compat";
import { buildSemanticTree } from "@fir/runtime-core";
import { renderToVoice } from "@fir/adapter-voice-ssml";
import { serve } from "./serve.js";

const program = new Command();
program.name("ir").description("FIR CLI").version("0.6.0");

program
  .command("validate")
  .argument("<input>")
  .action((input) => {
    const ir = loadIR(input);
    const res = validateIR(ir, schema);
    if (!res.ok) {
      console.error("INVALID IR:");
      for (const e of res.errors || []) console.error(" -", e);
      process.exit(2);
    }
    console.log("IR is valid.");
  });

program
  .command("canonicalize")
  .argument("<input>")
  .argument("<output>")
  .action((input, output) => {
    const ir = loadIR(input);
    const c = canonicalize(ir);
    saveIR(output, c);
    console.log("Wrote canonical IR to", output);
  });

program
  .command("lint-compat")
  .argument("<input>")
  .action((input) => {
    const ir = loadIR(input);
    const { messages, dci } = lintCompat(ir);
    console.log("DCI:", dci, "%");
    for (const m of messages) console.log(`${m.level}: ${m.path} ${m.message}`);
    if (ir.meta?.strictMode && messages.some((m) => m.level === "ERROR")) {
      console.error("Strict Mode: non-portable constructs present.");
      process.exit(3);
    }
  });

program
  .command("prove")
  .argument("<input>")
  .action((input) => {
    const ir = loadIR(input);
    const acts = (ir.actions || []) as any[];
    const issues: string[] = [];
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i];
      if (a.kind === "action.query") {
        const sql = String(a.sql || "").toLowerCase();
        if (!sql.includes(" limit "))
          issues.push(`/actions/${i}: query must include LIMIT`);
      }
    }
    const { messages } = lintCompat(ir);
    for (const m of messages)
      if (m.level === "ERROR") issues.push(`compat: ${m.path} ${m.message}`);
    if (issues.length) {
      console.error("PROOF FAILED:");
      for (const i of issues) console.error(" -", i);
      process.exit(4);
    }
    console.log("PROOF OK. ir_hash:", irHash(ir));
  });

program
  .command("render")
  .option("--adapter <name>", "voice")
  .argument("<input>")
  .action((input, opts) => {
    const ir = loadIR(input);
    const tree = buildSemanticTree(ir, { scale: 1 });
    if (opts.adapter === "voice") {
      console.log(renderToVoice(tree));
    } else {
      console.error("Unknown adapter", opts.adapter);
      process.exit(5);
    }
  });

program
  .command("serve")
  .description("Start a development server to preview IR")
  .argument("<input>", "path to IR file")
  .option("-p, --port <number>", "port to serve on", "8080")
  .option("-h, --host <string>", "host to bind to", "localhost")
  .action(async (input, opts) => {
    try {
      await serve(input, {
        port: parseInt(opts.port, 10),
        host: opts.host,
      });
    } catch (error) {
      console.error(
        "Failed to start server:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(6);
    }
  });

program.parse();
