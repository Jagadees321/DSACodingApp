export type Fundamental = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  java?: string;
  python?: string;
};

export const fundamentals: Fundamental[] = [
  {
    id: "time-complexity",
    title: "Time Complexity & Big-O",
    category: "Analysis",
    summary: "Measure how runtime grows with input size.",
    content:
      "Big-O describes the upper bound of an algorithm's growth. O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, O(n²) quadratic, O(2^n) exponential.",
    java: `// O(n) — linear scan\nint sum = 0;\nfor (int x : arr) sum += x;`,
    python: `# O(n) — linear scan\ntotal = sum(arr)`,
  },
  {
    id: "space-complexity",
    title: "Space Complexity",
    category: "Analysis",
    summary: "Track auxiliary memory used by an algorithm.",
    content:
      "Space complexity counts extra memory beyond the input — including recursion stack, temporary arrays, and hash maps.",
  },
  {
    id: "arrays",
    title: "Arrays",
    category: "Data Structures",
    summary: "Contiguous memory, O(1) random access.",
    content:
      "Arrays store elements in contiguous memory. Access by index is O(1); insert/delete at arbitrary positions is O(n).",
    java: `int[] a = {1, 2, 3, 4};\nSystem.out.println(a[2]); // 3`,
    python: `a = [1, 2, 3, 4]\nprint(a[2])  # 3`,
  },
  {
    id: "strings",
    title: "Strings",
    category: "Data Structures",
    summary: "Immutable sequences of characters.",
    content: "Most languages treat strings as immutable. Use StringBuilder (Java) or join() (Python) for efficient concatenation.",
  },
  {
    id: "linked-list",
    title: "Linked Lists",
    category: "Data Structures",
    summary: "Nodes connected by pointers.",
    content: "Singly/doubly linked lists allow O(1) insert/delete given a node, but O(n) lookup.",
  },
  {
    id: "stack",
    title: "Stacks (LIFO)",
    category: "Data Structures",
    summary: "Last in, first out.",
    content: "Push/pop in O(1). Used for recursion, undo, parsing.",
    java: `Deque<Integer> stack = new ArrayDeque<>();\nstack.push(1); stack.pop();`,
    python: `stack = []\nstack.append(1); stack.pop()`,
  },
  {
    id: "queue",
    title: "Queues (FIFO)",
    category: "Data Structures",
    summary: "First in, first out.",
    content: "Used in BFS, scheduling, streaming.",
  },
  {
    id: "deque",
    title: "Deque",
    category: "Data Structures",
    summary: "Double-ended queue.",
    content: "O(1) push/pop on both ends. Useful for sliding windows.",
  },
  {
    id: "hashmap",
    title: "Hash Maps",
    category: "Data Structures",
    summary: "Key→value with average O(1) access.",
    content: "Hashing maps keys to buckets. Watch for collisions and bad hash functions.",
  },
  {
    id: "hashset",
    title: "Hash Sets",
    category: "Data Structures",
    summary: "Unique elements with O(1) membership.",
    content: "Great for dedup, presence checks, and intersection problems.",
  },
  {
    id: "tree",
    title: "Trees",
    category: "Data Structures",
    summary: "Hierarchical, no cycles.",
    content: "Binary trees, BSTs, n-ary trees. Traversal: pre/in/post/level-order.",
  },
  {
    id: "bst",
    title: "Binary Search Trees",
    category: "Data Structures",
    summary: "Ordered binary tree.",
    content: "Average O(log n) search/insert/delete; degenerates to O(n) without balancing.",
  },
  {
    id: "heap",
    title: "Heaps / Priority Queues",
    category: "Data Structures",
    summary: "Always extract min or max in O(log n).",
    content: "Binary heap backs PriorityQueue (Java) and heapq (Python).",
  },
  {
    id: "graph",
    title: "Graphs",
    category: "Data Structures",
    summary: "Vertices + edges; directed or undirected.",
    content: "Represent with adjacency list (sparse) or matrix (dense).",
  },
  {
    id: "trie",
    title: "Tries",
    category: "Data Structures",
    summary: "Prefix tree for strings.",
    content: "Insert/search a word in O(L). Useful for autocomplete and prefix counting.",
  },
  {
    id: "recursion",
    title: "Recursion",
    category: "Techniques",
    summary: "Function calls itself with smaller input.",
    content: "Always define a base case. Watch the call stack depth.",
  },
  {
    id: "two-pointer",
    title: "Two Pointers",
    category: "Techniques",
    summary: "Walk a sequence with two indices.",
    content: "Common for sorted arrays, palindromes, partitioning.",
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    category: "Techniques",
    summary: "Move a window across a sequence.",
    content: "Convert O(n²) brute force into O(n) for subarray/substring problems.",
  },
  {
    id: "binary-search",
    title: "Binary Search",
    category: "Techniques",
    summary: "Halve the search space each step.",
    content: "Works on sorted data or monotonic predicates. O(log n).",
  },
  {
    id: "sorting",
    title: "Sorting",
    category: "Algorithms",
    summary: "Order elements.",
    content: "Built-in sorts (Timsort, dual-pivot quicksort) are O(n log n). Know merge, quick, and counting sort.",
  },
  {
    id: "bfs",
    title: "BFS",
    category: "Algorithms",
    summary: "Level-by-level graph traversal.",
    content: "Use a queue. Finds shortest path in unweighted graphs.",
  },
  {
    id: "dfs",
    title: "DFS",
    category: "Algorithms",
    summary: "Depth-first graph/tree traversal.",
    content: "Use recursion or an explicit stack.",
  },
  {
    id: "greedy",
    title: "Greedy",
    category: "Techniques",
    summary: "Make locally optimal choices.",
    content: "Works when the problem has the greedy-choice property and optimal substructure.",
  },
  {
    id: "dp",
    title: "Dynamic Programming",
    category: "Techniques",
    summary: "Solve subproblems once, store results.",
    content: "Top-down (memoization) or bottom-up (tabulation). Identify state and transitions.",
  },
  {
    id: "bit-manipulation",
    title: "Bit Manipulation",
    category: "Techniques",
    summary: "Operate directly on bits.",
    content: "AND, OR, XOR, shifts. Useful for sets, parity, and fast math.",
  },
];
