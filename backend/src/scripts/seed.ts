import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectMongo } from "../config/db.js";
import { FundamentalModel } from "../models/fundamental.model.js";
import { ProblemModel } from "../models/problem.model.js";
import { TestCaseModel } from "../models/test-case.model.js";
import { slugify } from "../lib/slugify.js";
import { logger } from "../lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../");

async function seed() {
  await connectMongo();

  const problemsModule = await import(
    path.resolve(repoRoot, "style-code-journey/src/data/problems.ts")
  );
  const fundamentalsModule = await import(
    path.resolve(repoRoot, "style-code-journey/src/data/fundamentals.ts")
  );

  const problems = problemsModule.problems as Array<any>;
  const fundamentals = fundamentalsModule.fundamentals as Array<any>;

  await ProblemModel.deleteMany({});
  await TestCaseModel.deleteMany({});
  await FundamentalModel.deleteMany({});

  for (let i = 0; i < problems.length; i += 1) {
    const p = problems[i];
    const problem = await ProblemModel.create({
      slug: p.id,
      title: p.title,
      level: p.level,
      difficulty: `L${p.level}`,
      category: p.topic,
      description: p.description,
      constraints: p.constraints ?? [],
      examples: p.examples ?? [],
      tags: [p.topic],
      xpReward: 50 + p.level * 10,
      orderIndex: i + 1,
      isPublished: true,
      starter: p.starter,
      solution: p.solution,
    });

    for (let j = 0; j < (p.tests ?? []).length; j += 1) {
      const t = p.tests[j];
      await TestCaseModel.create({
        problemId: problem._id,
        stdin: t.input,
        expectedOutput: t.expected,
        isHidden: j > 0,
        orderIndex: j + 1,
        label: `Case ${j + 1}`,
      });
    }
  }

  await FundamentalModel.insertMany(
    fundamentals.map((f: any, index: number) => ({
      slug: f.id || slugify(f.title),
      title: f.title,
      category: f.category,
      summary: f.summary,
      content: f.content,
      relatedProblemSlugs: [],
      orderIndex: index + 1,
      isPublished: true,
    })),
  );

  logger.info(
    { problems: problems.length, fundamentals: fundamentals.length },
    "Seed completed successfully",
  );
  process.exit(0);
}

seed().catch((error) => {
  logger.error({ err: error }, "Seed failed");
  process.exit(1);
});

