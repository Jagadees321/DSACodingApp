export type TestCase = { input: string; expected: string };

export type Problem = {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5;
  topic: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starter: { java: string; python: string };
  solution: { java: string; python: string };
  tests: TestCase[];
  // Mock executor key — runs JS-based reference for "Run"
  runner: (input: any) => any;
  parseInput: (raw: string) => any;
};

const num = (s: string) => Number(s);
const arr = (s: string) => JSON.parse(s);

const p = (
  o: Omit<Problem, "id"> & { id: string },
): Problem => o as Problem;

export const problems: Problem[] = [
  // ============ LEVEL 1 — Warmups (14) ============
  p({
    id: "sum-of-array",
    title: "Sum of Array",
    level: 1,
    topic: "Arrays",
    description: "Return the sum of all integers in the given array.",
    examples: [{ input: "[1,2,3,4]", output: "10" }],
    constraints: ["1 ≤ n ≤ 10^4", "-10^4 ≤ arr[i] ≤ 10^4"],
    starter: {
      java: `class Solution {\n    public int sumArray(int[] arr) {\n        // your code here\n        return 0;\n    }\n}`,
      python: `def sum_array(arr):\n    # your code here\n    pass`,
    },
    solution: {
      java: `class Solution {\n    public int sumArray(int[] arr) {\n        int s = 0;\n        for (int x : arr) s += x;\n        return s;\n    }\n}`,
      python: `def sum_array(arr):\n    return sum(arr)`,
    },
    tests: [
      { input: "[1,2,3,4]", expected: "10" },
      { input: "[5]", expected: "5" },
      { input: "[-1,1,-2,2]", expected: "0" },
    ],
    parseInput: arr,
    runner: (a: number[]) => a.reduce((x, y) => x + y, 0),
  }),
  p({
    id: "max-of-array",
    title: "Maximum Element",
    level: 1,
    topic: "Arrays",
    description: "Return the largest element in the array.",
    examples: [{ input: "[3,1,9,2]", output: "9" }],
    constraints: ["1 ≤ n ≤ 10^4"],
    starter: {
      java: `class Solution {\n    public int maxElement(int[] arr) {\n        return 0;\n    }\n}`,
      python: `def max_element(arr):\n    pass`,
    },
    solution: {
      java: `int m = arr[0]; for (int x : arr) if (x > m) m = x; return m;`,
      python: `return max(arr)`,
    },
    tests: [
      { input: "[3,1,9,2]", expected: "9" },
      { input: "[-5,-2,-9]", expected: "-2" },
    ],
    parseInput: arr,
    runner: (a: number[]) => Math.max(...a),
  }),
  p({
    id: "reverse-string",
    title: "Reverse a String",
    level: 1,
    topic: "Strings",
    description: "Return the reverse of the given string.",
    examples: [{ input: '"hello"', output: '"olleh"' }],
    constraints: ["1 ≤ |s| ≤ 10^4"],
    starter: {
      java: `class Solution {\n    public String reverse(String s) {\n        return "";\n    }\n}`,
      python: `def reverse(s):\n    pass`,
    },
    solution: {
      java: `return new StringBuilder(s).reverse().toString();`,
      python: `return s[::-1]`,
    },
    tests: [
      { input: '"hello"', expected: '"olleh"' },
      { input: '"a"', expected: '"a"' },
    ],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => s.split("").reverse().join(""),
  }),
  p({
    id: "is-even",
    title: "Even or Odd",
    level: 1,
    topic: "Math",
    description: 'Return "even" or "odd" for the given integer.',
    examples: [{ input: "4", output: '"even"' }],
    constraints: ["-10^9 ≤ n ≤ 10^9"],
    starter: {
      java: `String parity(int n){ return ""; }`,
      python: `def parity(n): pass`,
    },
    solution: {
      java: `return n % 2 == 0 ? "even" : "odd";`,
      python: `return "even" if n % 2 == 0 else "odd"`,
    },
    tests: [
      { input: "4", expected: '"even"' },
      { input: "7", expected: '"odd"' },
    ],
    parseInput: num,
    runner: (n: number) => (n % 2 === 0 ? "even" : "odd"),
  }),
  p({
    id: "count-vowels",
    title: "Count Vowels",
    level: 1,
    topic: "Strings",
    description: "Count vowels (a,e,i,o,u) in the string.",
    examples: [{ input: '"hello"', output: "2" }],
    constraints: ["1 ≤ |s| ≤ 10^4"],
    starter: {
      java: `int countVowels(String s){ return 0; }`,
      python: `def count_vowels(s): pass`,
    },
    solution: {
      java: `int c = 0; for (char ch : s.toCharArray()) if ("aeiou".indexOf(Character.toLowerCase(ch)) >= 0) c++; return c;`,
      python: `return sum(1 for ch in s.lower() if ch in "aeiou")`,
    },
    tests: [
      { input: '"hello"', expected: "2" },
      { input: '"sky"', expected: "0" },
    ],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => s.toLowerCase().split("").filter((c) => "aeiou".includes(c)).length,
  }),
  p({
    id: "factorial",
    title: "Factorial",
    level: 1,
    topic: "Recursion",
    description: "Return n! for n ≥ 0.",
    examples: [{ input: "5", output: "120" }],
    constraints: ["0 ≤ n ≤ 12"],
    starter: { java: `long factorial(int n){ return 0; }`, python: `def factorial(n): pass` },
    solution: {
      java: `long r = 1; for (int i = 2; i <= n; i++) r *= i; return r;`,
      python: `r = 1\nfor i in range(2, n+1): r *= i\nreturn r`,
    },
    tests: [
      { input: "0", expected: "1" },
      { input: "5", expected: "120" },
    ],
    parseInput: num,
    runner: (n: number) => {
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    },
  }),
  p({
    id: "fibonacci",
    title: "Nth Fibonacci",
    level: 1,
    topic: "DP",
    description: "Return the nth Fibonacci number (F0=0, F1=1).",
    examples: [{ input: "6", output: "8" }],
    constraints: ["0 ≤ n ≤ 40"],
    starter: { java: `int fib(int n){ return 0; }`, python: `def fib(n): pass` },
    solution: {
      java: `int a=0,b=1; for(int i=0;i<n;i++){int t=a+b;a=b;b=t;} return a;`,
      python: `a,b=0,1\nfor _ in range(n): a,b=b,a+b\nreturn a`,
    },
    tests: [
      { input: "0", expected: "0" },
      { input: "6", expected: "8" },
      { input: "10", expected: "55" },
    ],
    parseInput: num,
    runner: (n: number) => {
      let a = 0, b = 1;
      for (let i = 0; i < n; i++) [a, b] = [b, a + b];
      return a;
    },
  }),
  p({
    id: "is-palindrome",
    title: "Palindrome String",
    level: 1,
    topic: "Strings",
    description: "Check if the string reads the same forwards and backwards.",
    examples: [{ input: '"racecar"', output: "true" }],
    constraints: ["1 ≤ |s| ≤ 10^4"],
    starter: { java: `boolean isPalindrome(String s){ return false; }`, python: `def is_palindrome(s): pass` },
    solution: { java: `return new StringBuilder(s).reverse().toString().equals(s);`, python: `return s == s[::-1]` },
    tests: [
      { input: '"racecar"', expected: "true" },
      { input: '"hello"', expected: "false" },
    ],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => s === s.split("").reverse().join(""),
  }),
  p({
    id: "linear-search",
    title: "Linear Search",
    level: 1,
    topic: "Search",
    description: "Return the index of target in arr, or -1.",
    examples: [{ input: "[[1,3,5,7], 5]", output: "2" }],
    constraints: ["1 ≤ n ≤ 10^4"],
    starter: { java: `int search(int[] a, int t){ return -1; }`, python: `def search(a, t): pass` },
    solution: { java: `for (int i=0;i<a.length;i++) if (a[i]==t) return i; return -1;`, python: `return a.index(t) if t in a else -1` },
    tests: [
      { input: "[[1,3,5,7], 5]", expected: "2" },
      { input: "[[1,2,3], 9]", expected: "-1" },
    ],
    parseInput: arr,
    runner: ([a, t]: [number[], number]) => a.indexOf(t),
  }),
  p({
    id: "count-occurrences",
    title: "Count Occurrences",
    level: 1,
    topic: "Arrays",
    description: "Count how many times target appears in arr.",
    examples: [{ input: "[[1,2,2,3,2], 2]", output: "3" }],
    constraints: ["1 ≤ n ≤ 10^4"],
    starter: { java: `int count(int[] a, int t){ return 0; }`, python: `def count(a, t): pass` },
    solution: { java: `int c=0; for(int x:a) if(x==t) c++; return c;`, python: `return a.count(t)` },
    tests: [{ input: "[[1,2,2,3,2], 2]", expected: "3" }],
    parseInput: arr,
    runner: ([a, t]: [number[], number]) => a.filter((x) => x === t).length,
  }),
  p({
    id: "swap-numbers",
    title: "Swap Two Numbers",
    level: 1,
    topic: "Math",
    description: "Return [b, a] given [a, b].",
    examples: [{ input: "[3, 7]", output: "[7,3]" }],
    constraints: [],
    starter: { java: `int[] swap(int a, int b){ return null; }`, python: `def swap(a, b): pass` },
    solution: { java: `return new int[]{b, a};`, python: `return [b, a]` },
    tests: [{ input: "[3, 7]", expected: "[7,3]" }],
    parseInput: arr,
    runner: ([a, b]: [number, number]) => [b, a],
  }),
  p({
    id: "min-of-array",
    title: "Minimum Element",
    level: 1,
    topic: "Arrays",
    description: "Return the smallest element.",
    examples: [{ input: "[3,1,9,2]", output: "1" }],
    constraints: [],
    starter: { java: `int min(int[] a){ return 0; }`, python: `def min_el(a): pass` },
    solution: { java: `int m=a[0]; for(int x:a) if(x<m) m=x; return m;`, python: `return min(a)` },
    tests: [{ input: "[3,1,9,2]", expected: "1" }],
    parseInput: arr,
    runner: (a: number[]) => Math.min(...a),
  }),
  p({
    id: "average",
    title: "Average of Array",
    level: 1,
    topic: "Math",
    description: "Return the integer floor of the average.",
    examples: [{ input: "[2,4,6,8]", output: "5" }],
    constraints: [],
    starter: { java: `int avg(int[] a){ return 0; }`, python: `def avg(a): pass` },
    solution: { java: `int s=0; for(int x:a) s+=x; return s/a.length;`, python: `return sum(a)//len(a)` },
    tests: [{ input: "[2,4,6,8]", expected: "5" }],
    parseInput: arr,
    runner: (a: number[]) => Math.floor(a.reduce((x, y) => x + y, 0) / a.length),
  }),
  p({
    id: "string-length",
    title: "String Length (no built-in)",
    level: 1,
    topic: "Strings",
    description: "Return the length of the string by iterating.",
    examples: [{ input: '"hello"', output: "5" }],
    constraints: [],
    starter: { java: `int len(String s){ return 0; }`, python: `def length(s): pass` },
    solution: { java: `return s.toCharArray().length;`, python: `c=0\nfor _ in s: c+=1\nreturn c` },
    tests: [{ input: '"hello"', expected: "5" }],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => s.length,
  }),

  // ============ LEVEL 2 — Easy (14) ============
  p({
    id: "two-sum",
    title: "Two Sum",
    level: 2,
    topic: "Hash Map",
    description: "Return indices of two numbers that add to target.",
    examples: [{ input: "[[2,7,11,15], 9]", output: "[0,1]" }],
    constraints: ["2 ≤ n ≤ 10^4"],
    starter: { java: `int[] twoSum(int[] a, int t){ return null; }`, python: `def two_sum(a, t): pass` },
    solution: {
      java: `Map<Integer,Integer> m=new HashMap<>(); for(int i=0;i<a.length;i++){int c=t-a[i]; if(m.containsKey(c)) return new int[]{m.get(c),i}; m.put(a[i],i);} return null;`,
      python: `m={}\nfor i,x in enumerate(a):\n    if t-x in m: return [m[t-x], i]\n    m[x]=i`,
    },
    tests: [{ input: "[[2,7,11,15], 9]", expected: "[0,1]" }],
    parseInput: arr,
    runner: ([a, t]: [number[], number]) => {
      const m = new Map<number, number>();
      for (let i = 0; i < a.length; i++) {
        if (m.has(t - a[i])) return [m.get(t - a[i])!, i];
        m.set(a[i], i);
      }
      return [];
    },
  }),
  p({
    id: "valid-anagram",
    title: "Valid Anagram",
    level: 2,
    topic: "Strings",
    description: "Check if t is an anagram of s.",
    examples: [{ input: '["anagram","nagaram"]', output: "true" }],
    constraints: [],
    starter: { java: `boolean isAnagram(String s, String t){ return false; }`, python: `def is_anagram(s,t): pass` },
    solution: {
      java: `if(s.length()!=t.length()) return false; int[] c=new int[26]; for(char ch:s.toCharArray()) c[ch-'a']++; for(char ch:t.toCharArray()) if(--c[ch-'a']<0) return false; return true;`,
      python: `from collections import Counter\nreturn Counter(s)==Counter(t)`,
    },
    tests: [
      { input: '["anagram","nagaram"]', expected: "true" },
      { input: '["rat","car"]', expected: "false" },
    ],
    parseInput: arr,
    runner: ([s, t]: [string, string]) => s.split("").sort().join("") === t.split("").sort().join(""),
  }),
  p({
    id: "binary-search-prob",
    title: "Binary Search",
    level: 2,
    topic: "Search",
    description: "Search target in sorted array. Return index or -1.",
    examples: [{ input: "[[-1,0,3,5,9,12], 9]", output: "4" }],
    constraints: [],
    starter: { java: `int bs(int[] a, int t){ return -1; }`, python: `def bs(a,t): pass` },
    solution: {
      java: `int l=0,r=a.length-1; while(l<=r){int m=(l+r)>>>1; if(a[m]==t) return m; if(a[m]<t) l=m+1; else r=m-1;} return -1;`,
      python: `l,r=0,len(a)-1\nwhile l<=r:\n    m=(l+r)//2\n    if a[m]==t: return m\n    if a[m]<t: l=m+1\n    else: r=m-1\nreturn -1`,
    },
    tests: [
      { input: "[[-1,0,3,5,9,12], 9]", expected: "4" },
      { input: "[[1,3,5], 4]", expected: "-1" },
    ],
    parseInput: arr,
    runner: ([a, t]: [number[], number]) => {
      let l = 0, r = a.length - 1;
      while (l <= r) {
        const m = (l + r) >> 1;
        if (a[m] === t) return m;
        if (a[m] < t) l = m + 1;
        else r = m - 1;
      }
      return -1;
    },
  }),
  p({
    id: "remove-duplicates",
    title: "Remove Duplicates from Sorted Array",
    level: 2,
    topic: "Two Pointers",
    description: "Return the deduped sorted array.",
    examples: [{ input: "[1,1,2,3,3]", output: "[1,2,3]" }],
    constraints: [],
    starter: { java: `int[] dedup(int[] a){ return null; }`, python: `def dedup(a): pass` },
    solution: { java: `return Arrays.stream(a).distinct().toArray();`, python: `return sorted(set(a))` },
    tests: [{ input: "[1,1,2,3,3]", expected: "[1,2,3]" }],
    parseInput: arr,
    runner: (a: number[]) => Array.from(new Set(a)),
  }),
  p({
    id: "valid-parentheses",
    title: "Valid Parentheses",
    level: 2,
    topic: "Stack",
    description: "Check if brackets are balanced and properly nested.",
    examples: [{ input: '"()[]{}"', output: "true" }],
    constraints: [],
    starter: { java: `boolean isValid(String s){ return false; }`, python: `def is_valid(s): pass` },
    solution: {
      java: `Deque<Character> st=new ArrayDeque<>(); for(char c:s.toCharArray()){ if(c=='('||c=='['||c=='{') st.push(c); else { if(st.isEmpty()) return false; char o=st.pop(); if((c==')'&&o!='(')||(c==']'&&o!='[')||(c=='}'&&o!='{')) return false; } } return st.isEmpty();`,
      python: `st=[]; pairs={')':'(',']':'[','}':'{'}\nfor c in s:\n    if c in '([{': st.append(c)\n    else:\n        if not st or st.pop()!=pairs[c]: return False\nreturn not st`,
    },
    tests: [
      { input: '"()[]{}"', expected: "true" },
      { input: '"(]"', expected: "false" },
    ],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => {
      const st: string[] = [];
      const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      for (const c of s) {
        if ("([{".includes(c)) st.push(c);
        else if (st.pop() !== pairs[c]) return false;
      }
      return st.length === 0;
    },
  }),
  p({
    id: "merge-sorted",
    title: "Merge Two Sorted Arrays",
    level: 2,
    topic: "Two Pointers",
    description: "Merge two sorted arrays into one sorted array.",
    examples: [{ input: "[[1,3,5],[2,4,6]]", output: "[1,2,3,4,5,6]" }],
    constraints: [],
    starter: { java: `int[] merge(int[] a, int[] b){ return null; }`, python: `def merge(a,b): pass` },
    solution: {
      java: `int i=0,j=0,k=0; int[] r=new int[a.length+b.length]; while(i<a.length&&j<b.length) r[k++]=a[i]<=b[j]?a[i++]:b[j++]; while(i<a.length) r[k++]=a[i++]; while(j<b.length) r[k++]=b[j++]; return r;`,
      python: `import heapq\nreturn list(heapq.merge(a,b))`,
    },
    tests: [{ input: "[[1,3,5],[2,4,6]]", expected: "[1,2,3,4,5,6]" }],
    parseInput: arr,
    runner: ([a, b]: [number[], number[]]) => [...a, ...b].sort((x, y) => x - y),
  }),
  p({
    id: "first-unique",
    title: "First Unique Character",
    level: 2,
    topic: "Hash Map",
    description: "Return the index of the first non-repeating character, or -1.",
    examples: [{ input: '"leetcode"', output: "0" }],
    constraints: [],
    starter: { java: `int firstUniq(String s){ return -1; }`, python: `def first_uniq(s): pass` },
    solution: {
      java: `int[] c=new int[26]; for(char ch:s.toCharArray()) c[ch-'a']++; for(int i=0;i<s.length();i++) if(c[s.charAt(i)-'a']==1) return i; return -1;`,
      python: `from collections import Counter\nc=Counter(s)\nfor i,ch in enumerate(s):\n    if c[ch]==1: return i\nreturn -1`,
    },
    tests: [
      { input: '"leetcode"', expected: "0" },
      { input: '"aabb"', expected: "-1" },
    ],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => {
      const c: Record<string, number> = {};
      for (const ch of s) c[ch] = (c[ch] || 0) + 1;
      for (let i = 0; i < s.length; i++) if (c[s[i]] === 1) return i;
      return -1;
    },
  }),
  p({
    id: "missing-number",
    title: "Missing Number",
    level: 2,
    topic: "Math",
    description: "Array contains 0..n with one missing. Return the missing number.",
    examples: [{ input: "[3,0,1]", output: "2" }],
    constraints: [],
    starter: { java: `int missing(int[] a){ return 0; }`, python: `def missing(a): pass` },
    solution: { java: `int n=a.length, s=n*(n+1)/2; for(int x:a) s-=x; return s;`, python: `n=len(a); return n*(n+1)//2 - sum(a)` },
    tests: [{ input: "[3,0,1]", expected: "2" }],
    parseInput: arr,
    runner: (a: number[]) => {
      const n = a.length;
      return (n * (n + 1)) / 2 - a.reduce((x, y) => x + y, 0);
    },
  }),
  p({
    id: "best-time-buy-stock",
    title: "Best Time to Buy and Sell Stock",
    level: 2,
    topic: "Greedy",
    description: "Maximum profit from one buy-sell.",
    examples: [{ input: "[7,1,5,3,6,4]", output: "5" }],
    constraints: [],
    starter: { java: `int maxProfit(int[] p){ return 0; }`, python: `def max_profit(p): pass` },
    solution: {
      java: `int min=Integer.MAX_VALUE,best=0; for(int x:p){min=Math.min(min,x); best=Math.max(best,x-min);} return best;`,
      python: `lo=float('inf'); best=0\nfor x in p:\n    lo=min(lo,x); best=max(best,x-lo)\nreturn best`,
    },
    tests: [{ input: "[7,1,5,3,6,4]", expected: "5" }],
    parseInput: arr,
    runner: (p: number[]) => {
      let lo = Infinity, best = 0;
      for (const x of p) {
        lo = Math.min(lo, x);
        best = Math.max(best, x - lo);
      }
      return best;
    },
  }),
  p({
    id: "contains-duplicate",
    title: "Contains Duplicate",
    level: 2,
    topic: "Hash Set",
    description: "Return true if any element appears at least twice.",
    examples: [{ input: "[1,2,3,1]", output: "true" }],
    constraints: [],
    starter: { java: `boolean hasDup(int[] a){ return false; }`, python: `def has_dup(a): pass` },
    solution: { java: `Set<Integer> s=new HashSet<>(); for(int x:a) if(!s.add(x)) return true; return false;`, python: `return len(set(a))!=len(a)` },
    tests: [
      { input: "[1,2,3,1]", expected: "true" },
      { input: "[1,2,3]", expected: "false" },
    ],
    parseInput: arr,
    runner: (a: number[]) => new Set(a).size !== a.length,
  }),
  p({
    id: "fizzbuzz",
    title: "FizzBuzz",
    level: 2,
    topic: "Math",
    description: "Return array of strings 1..n with FizzBuzz rules.",
    examples: [{ input: "5", output: '["1","2","Fizz","4","Buzz"]' }],
    constraints: [],
    starter: { java: `String[] fizzbuzz(int n){ return null; }`, python: `def fizzbuzz(n): pass` },
    solution: {
      java: `String[] r=new String[n]; for(int i=1;i<=n;i++){ if(i%15==0) r[i-1]="FizzBuzz"; else if(i%3==0) r[i-1]="Fizz"; else if(i%5==0) r[i-1]="Buzz"; else r[i-1]=String.valueOf(i);} return r;`,
      python: `r=[]\nfor i in range(1,n+1):\n    if i%15==0: r.append("FizzBuzz")\n    elif i%3==0: r.append("Fizz")\n    elif i%5==0: r.append("Buzz")\n    else: r.append(str(i))\nreturn r`,
    },
    tests: [{ input: "5", expected: '["1","2","Fizz","4","Buzz"]' }],
    parseInput: num,
    runner: (n: number) => {
      const r: string[] = [];
      for (let i = 1; i <= n; i++) {
        if (i % 15 === 0) r.push("FizzBuzz");
        else if (i % 3 === 0) r.push("Fizz");
        else if (i % 5 === 0) r.push("Buzz");
        else r.push(String(i));
      }
      return r;
    },
  }),
  p({
    id: "move-zeroes",
    title: "Move Zeroes",
    level: 2,
    topic: "Two Pointers",
    description: "Move all 0s to the end, keep order of non-zero.",
    examples: [{ input: "[0,1,0,3,12]", output: "[1,3,12,0,0]" }],
    constraints: [],
    starter: { java: `int[] move(int[] a){ return null; }`, python: `def move(a): pass` },
    solution: { java: `// in-place two-pointer`, python: `nz=[x for x in a if x!=0]; return nz+[0]*(len(a)-len(nz))` },
    tests: [{ input: "[0,1,0,3,12]", expected: "[1,3,12,0,0]" }],
    parseInput: arr,
    runner: (a: number[]) => {
      const nz = a.filter((x) => x !== 0);
      return [...nz, ...new Array(a.length - nz.length).fill(0)];
    },
  }),
  p({
    id: "single-number",
    title: "Single Number",
    level: 2,
    topic: "Bit Manipulation",
    description: "Every element appears twice except one. Find it.",
    examples: [{ input: "[2,2,1]", output: "1" }],
    constraints: [],
    starter: { java: `int single(int[] a){ return 0; }`, python: `def single(a): pass` },
    solution: { java: `int r=0; for(int x:a) r^=x; return r;`, python: `from functools import reduce\nfrom operator import xor\nreturn reduce(xor, a)` },
    tests: [{ input: "[2,2,1]", expected: "1" }],
    parseInput: arr,
    runner: (a: number[]) => a.reduce((x, y) => x ^ y, 0),
  }),
  p({
    id: "climb-stairs",
    title: "Climbing Stairs",
    level: 2,
    topic: "DP",
    description: "Ways to climb n stairs taking 1 or 2 steps.",
    examples: [{ input: "3", output: "3" }],
    constraints: ["1 ≤ n ≤ 40"],
    starter: { java: `int climb(int n){ return 0; }`, python: `def climb(n): pass` },
    solution: { java: `int a=1,b=1; for(int i=2;i<=n;i++){int t=a+b;a=b;b=t;} return b;`, python: `a,b=1,1\nfor _ in range(2,n+1): a,b=b,a+b\nreturn b` },
    tests: [
      { input: "3", expected: "3" },
      { input: "5", expected: "8" },
    ],
    parseInput: num,
    runner: (n: number) => {
      let a = 1, b = 1;
      for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
      return b;
    },
  }),

  // ============ LEVEL 3 — Medium (14) ============
  p({
    id: "longest-substr",
    title: "Longest Substring Without Repeating",
    level: 3,
    topic: "Sliding Window",
    description: "Find length of longest substring with all unique chars.",
    examples: [{ input: '"abcabcbb"', output: "3" }],
    constraints: [],
    starter: { java: `int lengthOfLongest(String s){ return 0; }`, python: `def length_of_longest(s): pass` },
    solution: {
      java: `Map<Character,Integer> m=new HashMap<>(); int l=0,best=0; for(int r=0;r<s.length();r++){ char c=s.charAt(r); if(m.containsKey(c)) l=Math.max(l,m.get(c)+1); m.put(c,r); best=Math.max(best,r-l+1);} return best;`,
      python: `m={}; l=0; best=0\nfor r,c in enumerate(s):\n    if c in m and m[c]>=l: l=m[c]+1\n    m[c]=r; best=max(best,r-l+1)\nreturn best`,
    },
    tests: [
      { input: '"abcabcbb"', expected: "3" },
      { input: '"bbbb"', expected: "1" },
    ],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => {
      const m = new Map<string, number>();
      let l = 0, best = 0;
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        if (m.has(c) && m.get(c)! >= l) l = m.get(c)! + 1;
        m.set(c, r);
        best = Math.max(best, r - l + 1);
      }
      return best;
    },
  }),
  p({
    id: "group-anagrams",
    title: "Group Anagrams",
    level: 3,
    topic: "Hash Map",
    description: "Group strings that are anagrams of each other (return count of groups).",
    examples: [{ input: '["eat","tea","tan","ate","nat","bat"]', output: "3" }],
    constraints: [],
    starter: { java: `int groupCount(String[] a){ return 0; }`, python: `def group_count(a): pass` },
    solution: {
      java: `Map<String,List<String>> m=new HashMap<>(); for(String s:a){ char[] c=s.toCharArray(); Arrays.sort(c); m.computeIfAbsent(new String(c),k->new ArrayList<>()).add(s);} return m.size();`,
      python: `from collections import defaultdict\nd=defaultdict(list)\nfor s in a: d["".join(sorted(s))].append(s)\nreturn len(d)`,
    },
    tests: [{ input: '["eat","tea","tan","ate","nat","bat"]', expected: "3" }],
    parseInput: arr,
    runner: (a: string[]) => {
      const d = new Map<string, number>();
      for (const s of a) {
        const k = s.split("").sort().join("");
        d.set(k, (d.get(k) || 0) + 1);
      }
      return d.size;
    },
  }),
  p({
    id: "max-subarray",
    title: "Maximum Subarray (Kadane)",
    level: 3,
    topic: "DP",
    description: "Largest contiguous sum.",
    examples: [{ input: "[-2,1,-3,4,-1,2,1,-5,4]", output: "6" }],
    constraints: [],
    starter: { java: `int maxSub(int[] a){ return 0; }`, python: `def max_sub(a): pass` },
    solution: { java: `int cur=a[0],best=a[0]; for(int i=1;i<a.length;i++){ cur=Math.max(a[i],cur+a[i]); best=Math.max(best,cur);} return best;`, python: `cur=best=a[0]\nfor x in a[1:]: cur=max(x,cur+x); best=max(best,cur)\nreturn best` },
    tests: [{ input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6" }],
    parseInput: arr,
    runner: (a: number[]) => {
      let cur = a[0], best = a[0];
      for (let i = 1; i < a.length; i++) {
        cur = Math.max(a[i], cur + a[i]);
        best = Math.max(best, cur);
      }
      return best;
    },
  }),
  p({
    id: "product-except-self",
    title: "Product of Array Except Self",
    level: 3,
    topic: "Arrays",
    description: "Return array where output[i] is product of all other elements.",
    examples: [{ input: "[1,2,3,4]", output: "[24,12,8,6]" }],
    constraints: [],
    starter: { java: `int[] product(int[] a){ return null; }`, python: `def product(a): pass` },
    solution: { java: `// prefix * suffix`, python: `# prefix * suffix` },
    tests: [{ input: "[1,2,3,4]", expected: "[24,12,8,6]" }],
    parseInput: arr,
    runner: (a: number[]) => {
      const n = a.length, r = new Array(n).fill(1);
      let left = 1;
      for (let i = 0; i < n; i++) { r[i] = left; left *= a[i]; }
      let right = 1;
      for (let i = n - 1; i >= 0; i--) { r[i] *= right; right *= a[i]; }
      return r;
    },
  }),
  p({
    id: "rotate-array",
    title: "Rotate Array",
    level: 3,
    topic: "Arrays",
    description: "Rotate array to the right by k steps.",
    examples: [{ input: "[[1,2,3,4,5,6,7], 3]", output: "[5,6,7,1,2,3,4]" }],
    constraints: [],
    starter: { java: `int[] rotate(int[] a, int k){ return null; }`, python: `def rotate(a,k): pass` },
    solution: { java: `// reverse trick`, python: `k%=len(a); return a[-k:]+a[:-k]` },
    tests: [{ input: "[[1,2,3,4,5,6,7], 3]", expected: "[5,6,7,1,2,3,4]" }],
    parseInput: arr,
    runner: ([a, k]: [number[], number]) => {
      k %= a.length;
      return [...a.slice(-k), ...a.slice(0, -k)];
    },
  }),
  p({
    id: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    level: 3,
    topic: "Matrix",
    description: "If an element is 0, set its row and column to 0. Return new matrix.",
    examples: [{ input: "[[1,1,1],[1,0,1],[1,1,1]]", output: "[[1,0,1],[0,0,0],[1,0,1]]" }],
    constraints: [],
    starter: { java: `int[][] zero(int[][] m){ return null; }`, python: `def zero(m): pass` },
    solution: { java: `// mark rows/cols`, python: `# mark rows/cols` },
    tests: [{ input: "[[1,1,1],[1,0,1],[1,1,1]]", expected: "[[1,0,1],[0,0,0],[1,0,1]]" }],
    parseInput: arr,
    runner: (m: number[][]) => {
      const rows = new Set<number>(), cols = new Set<number>();
      for (let i = 0; i < m.length; i++)
        for (let j = 0; j < m[0].length; j++)
          if (m[i][j] === 0) { rows.add(i); cols.add(j); }
      return m.map((row, i) => row.map((v, j) => (rows.has(i) || cols.has(j) ? 0 : v)));
    },
  }),
  p({
    id: "spiral-matrix",
    title: "Spiral Matrix",
    level: 3,
    topic: "Matrix",
    description: "Return elements of the matrix in spiral order.",
    examples: [{ input: "[[1,2,3],[4,5,6],[7,8,9]]", output: "[1,2,3,6,9,8,7,4,5]" }],
    constraints: [],
    starter: { java: `int[] spiral(int[][] m){ return null; }`, python: `def spiral(m): pass` },
    solution: { java: `// bounds`, python: `# bounds` },
    tests: [{ input: "[[1,2,3],[4,5,6],[7,8,9]]", expected: "[1,2,3,6,9,8,7,4,5]" }],
    parseInput: arr,
    runner: (m: number[][]) => {
      const r: number[] = [];
      let t = 0, b = m.length - 1, l = 0, ri = m[0].length - 1;
      while (t <= b && l <= ri) {
        for (let i = l; i <= ri; i++) r.push(m[t][i]); t++;
        for (let i = t; i <= b; i++) r.push(m[i][ri]); ri--;
        if (t <= b) { for (let i = ri; i >= l; i--) r.push(m[b][i]); b--; }
        if (l <= ri) { for (let i = b; i >= t; i--) r.push(m[i][l]); l++; }
      }
      return r;
    },
  }),
  p({
    id: "kth-largest",
    title: "Kth Largest Element",
    level: 3,
    topic: "Heap",
    description: "Find the kth largest element in an array.",
    examples: [{ input: "[[3,2,1,5,6,4], 2]", output: "5" }],
    constraints: [],
    starter: { java: `int kth(int[] a, int k){ return 0; }`, python: `def kth(a,k): pass` },
    solution: { java: `// min-heap of size k`, python: `import heapq\nreturn heapq.nlargest(k,a)[-1]` },
    tests: [{ input: "[[3,2,1,5,6,4], 2]", expected: "5" }],
    parseInput: arr,
    runner: ([a, k]: [number[], number]) => [...a].sort((x, y) => y - x)[k - 1],
  }),
  p({
    id: "valid-bst",
    title: "Validate Binary Search Tree (Array form)",
    level: 3,
    topic: "Tree",
    description: "Given inorder traversal, return true if it's a valid BST (strictly increasing).",
    examples: [{ input: "[1,2,3,4]", output: "true" }],
    constraints: [],
    starter: { java: `boolean isBST(int[] inorder){ return false; }`, python: `def is_bst(io): pass` },
    solution: { java: `// strictly increasing`, python: `# strictly increasing` },
    tests: [
      { input: "[1,2,3,4]", expected: "true" },
      { input: "[1,3,2]", expected: "false" },
    ],
    parseInput: arr,
    runner: (a: number[]) => a.every((x, i) => i === 0 || a[i - 1] < x),
  }),
  p({
    id: "course-schedule",
    title: "Course Schedule (Cycle Detection)",
    level: 3,
    topic: "Graph",
    description: "Given prerequisites as edges, return true if all courses can be finished (no cycle).",
    examples: [{ input: "[2, [[1,0]]]", output: "true" }],
    constraints: [],
    starter: { java: `boolean canFinish(int n, int[][] pre){ return false; }`, python: `def can_finish(n,pre): pass` },
    solution: { java: `// topo sort`, python: `# topo sort` },
    tests: [
      { input: "[2, [[1,0]]]", expected: "true" },
      { input: "[2, [[1,0],[0,1]]]", expected: "false" },
    ],
    parseInput: arr,
    runner: ([n, pre]: [number, number[][]]) => {
      const adj: number[][] = Array.from({ length: n }, () => []);
      const ind = new Array(n).fill(0);
      for (const [a, b] of pre) { adj[b].push(a); ind[a]++; }
      const q: number[] = [];
      for (let i = 0; i < n; i++) if (ind[i] === 0) q.push(i);
      let count = 0;
      while (q.length) {
        const x = q.shift()!; count++;
        for (const y of adj[x]) if (--ind[y] === 0) q.push(y);
      }
      return count === n;
    },
  }),
  p({
    id: "coin-change",
    title: "Coin Change",
    level: 3,
    topic: "DP",
    description: "Fewest coins to make amount, or -1.",
    examples: [{ input: "[[1,2,5], 11]", output: "3" }],
    constraints: [],
    starter: { java: `int coinChange(int[] c, int n){ return 0; }`, python: `def coin_change(c,n): pass` },
    solution: { java: `// dp`, python: `# dp` },
    tests: [
      { input: "[[1,2,5], 11]", expected: "3" },
      { input: "[[2], 3]", expected: "-1" },
    ],
    parseInput: arr,
    runner: ([c, n]: [number[], number]) => {
      const dp = new Array(n + 1).fill(Infinity);
      dp[0] = 0;
      for (let i = 1; i <= n; i++) for (const coin of c) if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      return dp[n] === Infinity ? -1 : dp[n];
    },
  }),
  p({
    id: "house-robber",
    title: "House Robber",
    level: 3,
    topic: "DP",
    description: "Max sum without robbing two adjacent houses.",
    examples: [{ input: "[2,7,9,3,1]", output: "12" }],
    constraints: [],
    starter: { java: `int rob(int[] a){ return 0; }`, python: `def rob(a): pass` },
    solution: { java: `int p=0,c=0; for(int x:a){int t=Math.max(c,p+x); p=c; c=t;} return c;`, python: `p=c=0\nfor x in a: p,c=c,max(c,p+x)\nreturn c` },
    tests: [{ input: "[2,7,9,3,1]", expected: "12" }],
    parseInput: arr,
    runner: (a: number[]) => {
      let p = 0, c = 0;
      for (const x of a) { const t = Math.max(c, p + x); p = c; c = t; }
      return c;
    },
  }),
  p({
    id: "subsets-count",
    title: "Subsets Count",
    level: 3,
    topic: "Backtracking",
    description: "Return number of subsets (including empty).",
    examples: [{ input: "[1,2,3]", output: "8" }],
    constraints: [],
    starter: { java: `int subsetCount(int[] a){ return 0; }`, python: `def subset_count(a): pass` },
    solution: { java: `return 1<<a.length;`, python: `return 1<<len(a)` },
    tests: [{ input: "[1,2,3]", expected: "8" }],
    parseInput: arr,
    runner: (a: number[]) => 1 << a.length,
  }),
  p({
    id: "level-order-sum",
    title: "Tree Level Sum (Array form)",
    level: 3,
    topic: "BFS",
    description: "Given level-order array of a tree, return array of sums by level. Tree is complete.",
    examples: [{ input: "[1,2,3,4,5,6,7]", output: "[1,5,22]" }],
    constraints: [],
    starter: { java: `int[] levelSum(int[] t){ return null; }`, python: `def level_sum(t): pass` },
    solution: { java: `// BFS`, python: `# BFS` },
    tests: [{ input: "[1,2,3,4,5,6,7]", expected: "[1,5,22]" }],
    parseInput: arr,
    runner: (a: number[]) => {
      const r: number[] = [];
      let i = 0, lvl = 1;
      while (i < a.length) {
        let s = 0, c = 0;
        while (c < lvl && i < a.length) { s += a[i++]; c++; }
        r.push(s); lvl *= 2;
      }
      return r;
    },
  }),

  // ============ LEVEL 4 — Hard (14) ============
  p({
    id: "trapping-rain",
    title: "Trapping Rain Water",
    level: 4,
    topic: "Two Pointers",
    description: "Compute how much rain water can be trapped.",
    examples: [{ input: "[0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" }],
    constraints: [],
    starter: { java: `int trap(int[] h){ return 0; }`, python: `def trap(h): pass` },
    solution: { java: `// two pointers`, python: `# two pointers` },
    tests: [{ input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expected: "6" }],
    parseInput: arr,
    runner: (h: number[]) => {
      let l = 0, r = h.length - 1, lm = 0, rm = 0, w = 0;
      while (l < r) {
        if (h[l] < h[r]) { lm = Math.max(lm, h[l]); w += lm - h[l]; l++; }
        else { rm = Math.max(rm, h[r]); w += rm - h[r]; r--; }
      }
      return w;
    },
  }),
  p({
    id: "median-two-sorted",
    title: "Median of Two Sorted Arrays",
    level: 4,
    topic: "Binary Search",
    description: "Find the median (returned as a number, .5 allowed).",
    examples: [{ input: "[[1,3],[2]]", output: "2" }],
    constraints: [],
    starter: { java: `double median(int[] a, int[] b){ return 0; }`, python: `def median(a,b): pass` },
    solution: { java: `// merge or binary search`, python: `# merge or binary search` },
    tests: [
      { input: "[[1,3],[2]]", expected: "2" },
      { input: "[[1,2],[3,4]]", expected: "2.5" },
    ],
    parseInput: arr,
    runner: ([a, b]: [number[], number[]]) => {
      const m = [...a, ...b].sort((x, y) => x - y);
      const n = m.length;
      return n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2;
    },
  }),
  p({
    id: "longest-palindromic-substr",
    title: "Longest Palindromic Substring (length)",
    level: 4,
    topic: "DP",
    description: "Return the length of the longest palindromic substring.",
    examples: [{ input: '"babad"', output: "3" }],
    constraints: [],
    starter: { java: `int longestPal(String s){ return 0; }`, python: `def longest_pal(s): pass` },
    solution: { java: `// expand around center`, python: `# expand around center` },
    tests: [{ input: '"babad"', expected: "3" }, { input: '"cbbd"', expected: "2" }],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => {
      let best = 0;
      const expand = (l: number, r: number) => {
        while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
        return r - l - 1;
      };
      for (let i = 0; i < s.length; i++) best = Math.max(best, expand(i, i), expand(i, i + 1));
      return best;
    },
  }),
  p({
    id: "edit-distance",
    title: "Edit Distance",
    level: 4,
    topic: "DP",
    description: "Min operations (insert/delete/replace) to convert s to t.",
    examples: [{ input: '["horse","ros"]', output: "3" }],
    constraints: [],
    starter: { java: `int editDist(String s, String t){ return 0; }`, python: `def edit_dist(s,t): pass` },
    solution: { java: `// 2D dp`, python: `# 2D dp` },
    tests: [{ input: '["horse","ros"]', expected: "3" }],
    parseInput: arr,
    runner: ([s, t]: [string, string]) => {
      const m = s.length, n = t.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
        dp[i][j] = s[i - 1] === t[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      return dp[m][n];
    },
  }),
  p({
    id: "word-ladder-len",
    title: "Word Ladder Length",
    level: 4,
    topic: "BFS",
    description: "Shortest transformation from begin to end (changing one letter at a time).",
    examples: [{ input: '["hit","cog",["hot","dot","dog","lot","log","cog"]]', output: "5" }],
    constraints: [],
    starter: { java: `int ladder(String b, String e, String[] w){ return 0; }`, python: `def ladder(b,e,w): pass` },
    solution: { java: `// BFS`, python: `# BFS` },
    tests: [{ input: '["hit","cog",["hot","dot","dog","lot","log","cog"]]', expected: "5" }],
    parseInput: arr,
    runner: ([b, e, w]: [string, string, string[]]) => {
      const set = new Set(w);
      if (!set.has(e)) return 0;
      const q: [string, number][] = [[b, 1]];
      const seen = new Set([b]);
      while (q.length) {
        const [word, d] = q.shift()!;
        if (word === e) return d;
        for (let i = 0; i < word.length; i++)
          for (let c = 97; c <= 122; c++) {
            const nw = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
            if (set.has(nw) && !seen.has(nw)) { seen.add(nw); q.push([nw, d + 1]); }
          }
      }
      return 0;
    },
  }),
  p({
    id: "lru-ops-count",
    title: "LRU Cache — Hits Count",
    level: 4,
    topic: "Design",
    description: "Given capacity and operations as ['get k' | 'put k v'], return number of get hits.",
    examples: [{ input: '[2, ["put 1 1","put 2 2","get 1","put 3 3","get 2"]]', output: "1" }],
    constraints: [],
    starter: { java: `int run(int cap, String[] ops){ return 0; }`, python: `def run(cap, ops): pass` },
    solution: { java: `// LinkedHashMap`, python: `# OrderedDict` },
    tests: [{ input: '[2, ["put 1 1","put 2 2","get 1","put 3 3","get 2"]]', expected: "1" }],
    parseInput: arr,
    runner: ([cap, ops]: [number, string[]]) => {
      const m = new Map<number, number>();
      let hits = 0;
      for (const op of ops) {
        const parts = op.split(" ");
        if (parts[0] === "get") {
          const k = +parts[1];
          if (m.has(k)) { const v = m.get(k)!; m.delete(k); m.set(k, v); hits++; }
        } else {
          const k = +parts[1], v = +parts[2];
          if (m.has(k)) m.delete(k);
          m.set(k, v);
          if (m.size > cap) m.delete(m.keys().next().value as number);
        }
      }
      return hits;
    },
  }),
  p({
    id: "max-rectangle-histogram",
    title: "Largest Rectangle in Histogram",
    level: 4,
    topic: "Stack",
    description: "Largest rectangle area in a histogram.",
    examples: [{ input: "[2,1,5,6,2,3]", output: "10" }],
    constraints: [],
    starter: { java: `int largest(int[] h){ return 0; }`, python: `def largest(h): pass` },
    solution: { java: `// monotonic stack`, python: `# monotonic stack` },
    tests: [{ input: "[2,1,5,6,2,3]", expected: "10" }],
    parseInput: arr,
    runner: (h: number[]) => {
      const st: number[] = []; let best = 0; const a = [...h, 0];
      for (let i = 0; i < a.length; i++) {
        while (st.length && a[st[st.length - 1]] > a[i]) {
          const top = st.pop()!;
          const w = st.length ? i - st[st.length - 1] - 1 : i;
          best = Math.max(best, a[top] * w);
        }
        st.push(i);
      }
      return best;
    },
  }),
  p({
    id: "min-window-substr",
    title: "Minimum Window Substring (length)",
    level: 4,
    topic: "Sliding Window",
    description: "Length of smallest substring of s containing all chars of t. 0 if none.",
    examples: [{ input: '["ADOBECODEBANC","ABC"]', output: "4" }],
    constraints: [],
    starter: { java: `int minWindow(String s, String t){ return 0; }`, python: `def min_window(s,t): pass` },
    solution: { java: `// sliding window`, python: `# sliding window` },
    tests: [{ input: '["ADOBECODEBANC","ABC"]', expected: "4" }],
    parseInput: arr,
    runner: ([s, t]: [string, string]) => {
      const need: Record<string, number> = {};
      for (const c of t) need[c] = (need[c] || 0) + 1;
      let req = Object.keys(need).length, formed = 0;
      const have: Record<string, number> = {};
      let l = 0, best = Infinity;
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        have[c] = (have[c] || 0) + 1;
        if (need[c] && have[c] === need[c]) formed++;
        while (formed === req) {
          best = Math.min(best, r - l + 1);
          have[s[l]]--; if (need[s[l]] && have[s[l]] < need[s[l]]) formed--;
          l++;
        }
      }
      return best === Infinity ? 0 : best;
    },
  }),
  p({
    id: "n-queens-count",
    title: "N-Queens Solutions Count",
    level: 4,
    topic: "Backtracking",
    description: "Number of distinct N-queens placements on an n×n board.",
    examples: [{ input: "4", output: "2" }],
    constraints: ["1 ≤ n ≤ 9"],
    starter: { java: `int totalNQueens(int n){ return 0; }`, python: `def total_n_queens(n): pass` },
    solution: { java: `// backtracking`, python: `# backtracking` },
    tests: [
      { input: "4", expected: "2" },
      { input: "5", expected: "10" },
    ],
    parseInput: num,
    runner: (n: number) => {
      let count = 0;
      const cols = new Set<number>(), d1 = new Set<number>(), d2 = new Set<number>();
      const bt = (r: number) => {
        if (r === n) { count++; return; }
        for (let c = 0; c < n; c++) {
          if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
          cols.add(c); d1.add(r - c); d2.add(r + c);
          bt(r + 1);
          cols.delete(c); d1.delete(r - c); d2.delete(r + c);
        }
      };
      bt(0);
      return count;
    },
  }),
  p({
    id: "regex-match",
    title: "Wildcard Match (? and *)",
    level: 4,
    topic: "DP",
    description: "Match string with pattern using ? (any char) and * (any sequence).",
    examples: [{ input: '["aa","a*"]', output: "true" }],
    constraints: [],
    starter: { java: `boolean match(String s, String p){ return false; }`, python: `def match(s,p): pass` },
    solution: { java: `// dp`, python: `# dp` },
    tests: [
      { input: '["aa","a*"]', expected: "true" },
      { input: '["cb","?a"]', expected: "false" },
    ],
    parseInput: arr,
    runner: ([s, p]: [string, string]) => {
      const m = s.length, n = p.length;
      const dp: boolean[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
      dp[0][0] = true;
      for (let j = 1; j <= n; j++) if (p[j - 1] === "*") dp[0][j] = dp[0][j - 1];
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
        if (p[j - 1] === "*") dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
        else if (p[j - 1] === "?" || p[j - 1] === s[i - 1]) dp[i][j] = dp[i - 1][j - 1];
      }
      return dp[m][n];
    },
  }),
  p({
    id: "serialize-tree-len",
    title: "Serialize Tree (Output Length)",
    level: 4,
    topic: "Tree",
    description: "Given level-order array (with nulls as -1), return length of comma-joined serialization.",
    examples: [{ input: "[1,2,3,-1,-1,4,5]", output: "13" }],
    constraints: [],
    starter: { java: `int serializeLen(int[] t){ return 0; }`, python: `def serialize_len(t): pass` },
    solution: { java: `// trim`, python: `# trim` },
    tests: [{ input: "[1,2,3,-1,-1,4,5]", expected: "13" }],
    parseInput: arr,
    runner: (a: number[]) => a.map((x) => (x === -1 ? "N" : String(x))).join(",").length,
  }),
  p({
    id: "merge-k-sorted",
    title: "Merge K Sorted Arrays",
    level: 4,
    topic: "Heap",
    description: "Merge k sorted arrays into one sorted array.",
    examples: [{ input: "[[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" }],
    constraints: [],
    starter: { java: `int[] mergeK(int[][] arrs){ return null; }`, python: `def merge_k(arrs): pass` },
    solution: { java: `// PQ`, python: `# heapq` },
    tests: [{ input: "[[1,4,5],[1,3,4],[2,6]]", expected: "[1,1,2,3,4,4,5,6]" }],
    parseInput: arr,
    runner: (arrs: number[][]) => arrs.flat().sort((a, b) => a - b),
  }),
  p({
    id: "shortest-path-grid",
    title: "Shortest Path in Binary Matrix",
    level: 4,
    topic: "BFS",
    description: "Shortest path from top-left to bottom-right (8-directional, 0=open). -1 if blocked.",
    examples: [{ input: "[[0,1],[1,0]]", output: "2" }],
    constraints: [],
    starter: { java: `int shortest(int[][] g){ return 0; }`, python: `def shortest(g): pass` },
    solution: { java: `// BFS`, python: `# BFS` },
    tests: [{ input: "[[0,1],[1,0]]", expected: "2" }],
    parseInput: arr,
    runner: (g: number[][]) => {
      const n = g.length;
      if (g[0][0] || g[n - 1][n - 1]) return -1;
      const q: [number, number, number][] = [[0, 0, 1]];
      const seen = new Set<string>([`0,0`]);
      const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      while (q.length) {
        const [r, c, d] = q.shift()!;
        if (r === n - 1 && c === n - 1) return d;
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= n || nc >= n || g[nr][nc] || seen.has(`${nr},${nc}`)) continue;
          seen.add(`${nr},${nc}`); q.push([nr, nc, d + 1]);
        }
      }
      return -1;
    },
  }),
  p({
    id: "longest-increasing-subseq",
    title: "Longest Increasing Subsequence",
    level: 4,
    topic: "DP",
    description: "Length of LIS.",
    examples: [{ input: "[10,9,2,5,3,7,101,18]", output: "4" }],
    constraints: [],
    starter: { java: `int lis(int[] a){ return 0; }`, python: `def lis(a): pass` },
    solution: { java: `// O(n log n)`, python: `# O(n log n)` },
    tests: [{ input: "[10,9,2,5,3,7,101,18]", expected: "4" }],
    parseInput: arr,
    runner: (a: number[]) => {
      const tails: number[] = [];
      for (const x of a) {
        let l = 0, r = tails.length;
        while (l < r) { const m = (l + r) >> 1; if (tails[m] < x) l = m + 1; else r = m; }
        tails[l] = x;
      }
      return tails.length;
    },
  }),

  // ============ LEVEL 5 — Expert (14) ============
  p({
    id: "skyline",
    title: "The Skyline Problem (Key Points Count)",
    level: 5,
    topic: "Heap",
    description: "Return number of key points in the skyline.",
    examples: [{ input: "[[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]", output: "8" }],
    constraints: [],
    starter: { java: `int skylineCount(int[][] b){ return 0; }`, python: `def skyline_count(b): pass` },
    solution: { java: `// sweep`, python: `# sweep` },
    tests: [{ input: "[[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]", expected: "8" }],
    parseInput: arr,
    runner: (b: number[][]) => {
      type E = [number, number];
      const events: E[] = [];
      for (const [l, r, h] of b) { events.push([l, -h]); events.push([r, h]); }
      events.sort((a, c) => a[0] - c[0] || a[1] - c[1]);
      const heap: number[] = [0];
      let prev = 0, count = 0;
      const active = new Map<number, number>();
      for (const [x, h] of events) {
        if (h < 0) { heap.push(-h); active.set(-h, (active.get(-h) || 0) + 1); }
        else { active.set(h, (active.get(h) || 1) - 1); }
        while (heap.length && (active.get(heap[heap.length - 1]) || 0) <= 0) heap.pop();
        heap.sort((a, c) => a - c);
        const cur = heap[heap.length - 1] || 0;
        if (cur !== prev) { count++; prev = cur; }
      }
      return count;
    },
  }),
  p({
    id: "word-break",
    title: "Word Break",
    level: 5,
    topic: "DP",
    description: "Can s be segmented into space-separated dictionary words?",
    examples: [{ input: '["leetcode",["leet","code"]]', output: "true" }],
    constraints: [],
    starter: { java: `boolean wb(String s, String[] d){ return false; }`, python: `def wb(s,d): pass` },
    solution: { java: `// dp`, python: `# dp` },
    tests: [
      { input: '["leetcode",["leet","code"]]', expected: "true" },
      { input: '["catsandog",["cats","dog","sand","and","cat"]]', expected: "false" },
    ],
    parseInput: arr,
    runner: ([s, d]: [string, string[]]) => {
      const set = new Set(d);
      const dp = new Array(s.length + 1).fill(false);
      dp[0] = true;
      for (let i = 1; i <= s.length; i++) for (let j = 0; j < i; j++)
        if (dp[j] && set.has(s.slice(j, i))) { dp[i] = true; break; }
      return dp[s.length];
    },
  }),
  p({
    id: "max-path-sum",
    title: "Tree Max Path Sum (Array form)",
    level: 5,
    topic: "Tree",
    description: "Given complete tree as level-order, return maximum path sum (any node to any node).",
    examples: [{ input: "[1,2,3]", output: "6" }],
    constraints: [],
    starter: { java: `int maxPath(int[] t){ return 0; }`, python: `def max_path(t): pass` },
    solution: { java: `// dfs`, python: `# dfs` },
    tests: [{ input: "[1,2,3]", expected: "6" }],
    parseInput: arr,
    runner: (t: number[]) => {
      let best = -Infinity;
      const dfs = (i: number): number => {
        if (i >= t.length) return 0;
        const l = Math.max(0, dfs(2 * i + 1));
        const r = Math.max(0, dfs(2 * i + 2));
        best = Math.max(best, t[i] + l + r);
        return t[i] + Math.max(l, r);
      };
      dfs(0);
      return best;
    },
  }),
  p({
    id: "interval-merge",
    title: "Merge Intervals (Count After Merge)",
    level: 5,
    topic: "Sorting",
    description: "Return number of intervals after merging overlaps.",
    examples: [{ input: "[[1,3],[2,6],[8,10],[15,18]]", output: "3" }],
    constraints: [],
    starter: { java: `int mergeCount(int[][] iv){ return 0; }`, python: `def merge_count(iv): pass` },
    solution: { java: `// sort + sweep`, python: `# sort + sweep` },
    tests: [{ input: "[[1,3],[2,6],[8,10],[15,18]]", expected: "3" }],
    parseInput: arr,
    runner: (iv: number[][]) => {
      iv = [...iv].sort((a, b) => a[0] - b[0]);
      const out: number[][] = [];
      for (const [s, e] of iv) {
        if (out.length && out[out.length - 1][1] >= s) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
        else out.push([s, e]);
      }
      return out.length;
    },
  }),
  p({
    id: "find-duplicate",
    title: "Find the Duplicate Number",
    level: 5,
    topic: "Two Pointers",
    description: "Array of n+1 numbers in [1,n], one is duplicated. Find it.",
    examples: [{ input: "[1,3,4,2,2]", output: "2" }],
    constraints: [],
    starter: { java: `int findDup(int[] a){ return 0; }`, python: `def find_dup(a): pass` },
    solution: { java: `// Floyd cycle`, python: `# Floyd cycle` },
    tests: [{ input: "[1,3,4,2,2]", expected: "2" }],
    parseInput: arr,
    runner: (a: number[]) => {
      let slow = a[0], fast = a[0];
      do { slow = a[slow]; fast = a[a[fast]]; } while (slow !== fast);
      slow = a[0];
      while (slow !== fast) { slow = a[slow]; fast = a[fast]; }
      return slow;
    },
  }),
  p({
    id: "max-product-subarray",
    title: "Maximum Product Subarray",
    level: 5,
    topic: "DP",
    description: "Largest product of a contiguous subarray.",
    examples: [{ input: "[2,3,-2,4]", output: "6" }],
    constraints: [],
    starter: { java: `int maxProd(int[] a){ return 0; }`, python: `def max_prod(a): pass` },
    solution: { java: `// track min/max`, python: `# track min/max` },
    tests: [{ input: "[2,3,-2,4]", expected: "6" }],
    parseInput: arr,
    runner: (a: number[]) => {
      let mn = a[0], mx = a[0], best = a[0];
      for (let i = 1; i < a.length; i++) {
        const c = [a[i], a[i] * mn, a[i] * mx];
        mn = Math.min(...c); mx = Math.max(...c);
        best = Math.max(best, mx);
      }
      return best;
    },
  }),
  p({
    id: "alien-dict",
    title: "Alien Dictionary (Order Length)",
    level: 5,
    topic: "Graph",
    description: "Given a sorted list of words, return length of derivable alien alphabet ordering. 0 if invalid.",
    examples: [{ input: '["wrt","wrf","er","ett","rftt"]', output: "4" }],
    constraints: [],
    starter: { java: `int alienLen(String[] w){ return 0; }`, python: `def alien_len(w): pass` },
    solution: { java: `// topo`, python: `# topo` },
    tests: [{ input: '["wrt","wrf","er","ett","rftt"]', expected: "4" }],
    parseInput: arr,
    runner: (w: string[]) => {
      const adj = new Map<string, Set<string>>();
      const ind = new Map<string, number>();
      for (const word of w) for (const c of word) { adj.set(c, adj.get(c) || new Set()); ind.set(c, ind.get(c) || 0); }
      for (let i = 0; i < w.length - 1; i++) {
        const a = w[i], b = w[i + 1];
        if (a.length > b.length && a.startsWith(b)) return 0;
        for (let j = 0; j < Math.min(a.length, b.length); j++) {
          if (a[j] !== b[j]) {
            if (!adj.get(a[j])!.has(b[j])) { adj.get(a[j])!.add(b[j]); ind.set(b[j], ind.get(b[j])! + 1); }
            break;
          }
        }
      }
      const q: string[] = [];
      ind.forEach((v, k) => { if (v === 0) q.push(k); });
      const order: string[] = [];
      while (q.length) {
        const x = q.shift()!; order.push(x);
        for (const y of adj.get(x)!) { ind.set(y, ind.get(y)! - 1); if (ind.get(y) === 0) q.push(y); }
      }
      return order.length === ind.size ? order.length : 0;
    },
  }),
  p({
    id: "burst-balloons",
    title: "Burst Balloons",
    level: 5,
    topic: "DP",
    description: "Maximum coins by bursting balloons (interval DP).",
    examples: [{ input: "[3,1,5,8]", output: "167" }],
    constraints: ["1 ≤ n ≤ 50"],
    starter: { java: `int maxCoins(int[] a){ return 0; }`, python: `def max_coins(a): pass` },
    solution: { java: `// interval dp`, python: `# interval dp` },
    tests: [{ input: "[3,1,5,8]", expected: "167" }],
    parseInput: arr,
    runner: (a: number[]) => {
      const nums = [1, ...a, 1];
      const n = nums.length;
      const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let len = 2; len < n; len++) {
        for (let l = 0; l < n - len; l++) {
          const r = l + len;
          for (let k = l + 1; k < r; k++)
            dp[l][r] = Math.max(dp[l][r], dp[l][k] + nums[l] * nums[k] * nums[r] + dp[k][r]);
        }
      }
      return dp[0][n - 1];
    },
  }),
  p({
    id: "sliding-window-max",
    title: "Sliding Window Maximum (Sum of Maxes)",
    level: 5,
    topic: "Deque",
    description: "Return sum of window maximums for window size k.",
    examples: [{ input: "[[1,3,-1,-3,5,3,6,7], 3]", output: "27" }],
    constraints: [],
    starter: { java: `int sumOfMax(int[] a, int k){ return 0; }`, python: `def sum_of_max(a,k): pass` },
    solution: { java: `// deque`, python: `# deque` },
    tests: [{ input: "[[1,3,-1,-3,5,3,6,7], 3]", expected: "27" }],
    parseInput: arr,
    runner: ([a, k]: [number[], number]) => {
      const dq: number[] = []; let s = 0;
      for (let i = 0; i < a.length; i++) {
        while (dq.length && dq[0] <= i - k) dq.shift();
        while (dq.length && a[dq[dq.length - 1]] < a[i]) dq.pop();
        dq.push(i);
        if (i >= k - 1) s += a[dq[0]];
      }
      return s;
    },
  }),
  p({
    id: "palindrome-partition-min",
    title: "Palindrome Partitioning II",
    level: 5,
    topic: "DP",
    description: "Min cuts so every substring is a palindrome.",
    examples: [{ input: '"aab"', output: "1" }],
    constraints: [],
    starter: { java: `int minCut(String s){ return 0; }`, python: `def min_cut(s): pass` },
    solution: { java: `// dp`, python: `# dp` },
    tests: [{ input: '"aab"', expected: "1" }],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => {
      const n = s.length;
      const pal: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
      for (let i = n - 1; i >= 0; i--)
        for (let j = i; j < n; j++)
          if (s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1])) pal[i][j] = true;
      const dp = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        if (pal[0][i]) { dp[i] = 0; continue; }
        dp[i] = i;
        for (let j = 1; j <= i; j++) if (pal[j][i]) dp[i] = Math.min(dp[i], dp[j - 1] + 1);
      }
      return dp[n - 1];
    },
  }),
  p({
    id: "reverse-pairs",
    title: "Reverse Pairs Count",
    level: 5,
    topic: "Merge Sort",
    description: "Count pairs (i, j) with i < j and a[i] > 2*a[j].",
    examples: [{ input: "[1,3,2,3,1]", output: "2" }],
    constraints: [],
    starter: { java: `int reversePairs(int[] a){ return 0; }`, python: `def reverse_pairs(a): pass` },
    solution: { java: `// merge sort`, python: `# merge sort` },
    tests: [{ input: "[1,3,2,3,1]", expected: "2" }],
    parseInput: arr,
    runner: (a: number[]) => {
      let count = 0;
      const sort = (l: number, r: number): void => {
        if (l >= r) return;
        const m = (l + r) >> 1;
        sort(l, m); sort(m + 1, r);
        let j = m + 1;
        for (let i = l; i <= m; i++) {
          while (j <= r && a[i] > 2 * a[j]) j++;
          count += j - m - 1;
        }
        const tmp = a.slice(l, r + 1).sort((x, y) => x - y);
        for (let i = 0; i < tmp.length; i++) a[l + i] = tmp[i];
      };
      sort(0, a.length - 1);
      return count;
    },
  }),
  p({
    id: "longest-consecutive",
    title: "Longest Consecutive Sequence",
    level: 5,
    topic: "Hash Set",
    description: "Length of the longest consecutive elements sequence.",
    examples: [{ input: "[100,4,200,1,3,2]", output: "4" }],
    constraints: [],
    starter: { java: `int longest(int[] a){ return 0; }`, python: `def longest(a): pass` },
    solution: { java: `// hash set`, python: `# hash set` },
    tests: [{ input: "[100,4,200,1,3,2]", expected: "4" }],
    parseInput: arr,
    runner: (a: number[]) => {
      const set = new Set(a); let best = 0;
      for (const x of set) {
        if (set.has(x - 1)) continue;
        let cur = x, len = 1;
        while (set.has(cur + 1)) { cur++; len++; }
        best = Math.max(best, len);
      }
      return best;
    },
  }),
  p({
    id: "kmp-count",
    title: "KMP Pattern Count",
    level: 5,
    topic: "Strings",
    description: "Count non-overlapping occurrences of pattern in text.",
    examples: [{ input: '["ababab","ab"]', output: "3" }],
    constraints: [],
    starter: { java: `int countOcc(String t, String p){ return 0; }`, python: `def count_occ(t,p): pass` },
    solution: { java: `// KMP`, python: `# KMP` },
    tests: [{ input: '["ababab","ab"]', expected: "3" }],
    parseInput: arr,
    runner: ([t, p]: [string, string]) => {
      let i = 0, c = 0;
      while ((i = t.indexOf(p, i)) !== -1) { c++; i += p.length; }
      return c;
    },
  }),
  p({
    id: "atoi",
    title: "String to Integer (atoi)",
    level: 5,
    topic: "Strings",
    description: "Convert string to 32-bit signed integer with clamping.",
    examples: [{ input: '"   -42"', output: "-42" }],
    constraints: [],
    starter: { java: `int atoi(String s){ return 0; }`, python: `def atoi(s): pass` },
    solution: { java: `// state machine`, python: `# state machine` },
    tests: [
      { input: '"   -42"', expected: "-42" },
      { input: '"4193 with words"', expected: "4193" },
    ],
    parseInput: (s) => JSON.parse(s),
    runner: (s: string) => {
      const m = s.match(/^\s*([-+]?\d+)/);
      if (!m) return 0;
      const n = parseInt(m[1], 10);
      const MAX = 2 ** 31 - 1, MIN = -(2 ** 31);
      return Math.max(MIN, Math.min(MAX, n));
    },
  }),
];

export const problemsByLevel = (level: 1 | 2 | 3 | 4 | 5) => problems.filter((p) => p.level === level);
export const getProblem = (id: string) => problems.find((p) => p.id === id);

export const LEVELS: { num: 1 | 2 | 3 | 4 | 5; name: string; tagline: string }[] = [
  { num: 1, name: "Initiate", tagline: "Warmups · syntax & loops" },
  { num: 2, name: "Apprentice", tagline: "Easy classics · arrays, strings" },
  { num: 3, name: "Operator", tagline: "Medium · sliding window, DP basics" },
  { num: 4, name: "Architect", tagline: "Hard · graphs, advanced DP" },
  { num: 5, name: "Overlord", tagline: "Expert · system & interval DP" },
];
