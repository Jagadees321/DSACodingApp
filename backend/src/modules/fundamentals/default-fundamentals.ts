export const defaultFundamentals = [
  {
    title: "Big O Basics",
    slug: "big-o-basics",
    category: "Complexity",
    summary: "Understand time/space complexity and compare common growth rates.",
    content:
      "Big O describes how runtime or memory grows with input size. Prioritize lower growth rates for scalable solutions. Typical order: O(1) < O(log n) < O(n) < O(n log n) < O(n^2).",
    relatedProblemSlugs: ["two-sum", "binary-search", "maximum-subarray"],
    orderIndex: 1,
    isPublished: true,
  },
  {
    title: "Arrays and Strings",
    slug: "arrays-strings-basics",
    category: "Arrays",
    summary: "Master traversal patterns, two pointers, and prefix/suffix tricks.",
    content:
      "Most beginner interview tasks are array or string transforms. Learn indexing, in-place updates, two-pointer scans, sliding windows, and prefix-suffix accumulations.",
    relatedProblemSlugs: ["two-sum", "product-except-self", "longest-substring-without-repeating"],
    orderIndex: 2,
    isPublished: true,
  },
  {
    title: "Sliding Window",
    slug: "sliding-window",
    category: "Sliding Window",
    summary: "Optimize subarray/substring problems with dynamic ranges.",
    content:
      "Use two pointers to represent a current range and update it as you expand/contract. This reduces many O(n^2) scans to O(n).",
    relatedProblemSlugs: ["longest-substring-without-repeating", "best-time-buy-sell-stock"],
    orderIndex: 3,
    isPublished: true,
  },
  {
    title: "Hashing",
    slug: "hashing",
    category: "HashMap",
    summary: "Use hash maps/sets for fast lookups and frequency counting.",
    content:
      "Hash tables give average O(1) insert/find. Useful for complements, deduplication, counting frequencies, and first-seen index patterns.",
    relatedProblemSlugs: ["two-sum", "3sum"],
    orderIndex: 4,
    isPublished: true,
  },
  {
    title: "Dynamic Programming Intro",
    slug: "dynamic-programming-intro",
    category: "Dynamic Programming",
    summary: "Break problems into overlapping subproblems with reusable states.",
    content:
      "DP stores answers to smaller states so each is solved once. Start with recurrence, define state and transition, then implement top-down memoization or bottom-up tabulation.",
    relatedProblemSlugs: ["climbing-stairs", "house-robber", "coin-change"],
    orderIndex: 5,
    isPublished: true,
  },
  {
    title: "Graph Traversal",
    slug: "graph-traversal",
    category: "Graphs",
    summary: "Use DFS/BFS for connected components, reachability, and shortest unweighted path.",
    content:
      "Model relationships as a graph and traverse systematically. DFS is natural for recursion/backtracking. BFS explores by distance in unweighted graphs.",
    relatedProblemSlugs: ["number-of-islands", "course-schedule", "word-search"],
    orderIndex: 6,
    isPublished: true,
  },
];

