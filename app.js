document.addEventListener("DOMContentLoaded", () => {
  const languageSelect = document.getElementById("languageSelect");
  const actionSelect = document.getElementById("actionSelect");
  const codeInput = document.getElementById("codeInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const btnSpinner = document.getElementById("btnSpinner");
  const btnText = document.getElementById("btnText");
  const outputContainer = document.getElementById("outputContainer");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const loadSampleBtn = document.getElementById("loadSampleBtn");

  // Output terminal elements
  const executionWindow = document.getElementById("executionWindow");
  const statusBadge = document.getElementById("statusBadge");

  // Sample templates for quick testing
  const sampleSnippets = {
    Java: `public class BinarySearch {\n    public static int search(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n}`,
    Python: `def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
    "C++": `int binarySearch(const std::vector<int>& nums, int target) {\n    int left = 0, right = nums.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] == target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}`,
    JavaScript: `function binarySearch(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor(left + (right - left) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}`,
    PHP: `function binarySearch($nums, $target) {\n    $left = 0;\n    $right = count($nums) - 1;\n    while ($left <= $right) {\n        $mid = intdiv($left + $right, 2);\n        if ($nums[$mid] === $target) return $mid;\n        if ($nums[$mid] < $target) $left = $mid + 1;\n        else $right = $mid - 1;\n    }\n    return -1;\n}`
  };

  // Smart Indentation & Tab key handling inside the code textarea
  codeInput.addEventListener("keydown", (e) => {
    // 1. Handle Tab and Shift + Tab
    if (e.key === "Tab") {
      e.preventDefault();
      const start = codeInput.selectionStart;
      const end = codeInput.selectionEnd;
      const val = codeInput.value;

      // Single cursor: insert 4 spaces
      if (start === end) {
        if (!e.shiftKey) {
          codeInput.value = val.substring(0, start) + "    " + val.substring(end);
          codeInput.selectionStart = codeInput.selectionEnd = start + 4;
        }
        return;
      }

      // Multiline selection: indent or outdent lines
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = val.indexOf("\n", end) === -1 ? val.length : val.indexOf("\n", end);
      const lines = val.substring(lineStart, lineEnd).split("\n");

      let modifiedText = "";
      let offset = 0;

      if (e.shiftKey) {
        // Shift + Tab: remove up to 4 spaces or 1 tab
        modifiedText = lines
          .map((line) => {
            if (line.startsWith("    ")) {
              offset -= 4;
              return line.substring(4);
            } else if (line.startsWith("\t")) {
              offset -= 1;
              return line.substring(1);
            }
            return line;
          })
          .join("\n");
      } else {
        // Tab: prepend 4 spaces
        modifiedText = lines.map((line) => "    " + line).join("\n");
        offset = lines.length * 4;
      }

      codeInput.value = val.substring(0, lineStart) + modifiedText + val.substring(lineEnd);
      codeInput.selectionStart = start;
      codeInput.selectionEnd = Math.max(start, end + offset);
      return;
    }

    // 2. Handle Enter: replicate previous line's indent + auto-indent after '{', ':', '('
    if (e.key === "Enter") {
      const start = codeInput.selectionStart;
      const val = codeInput.value;
      const currentLineStart = val.lastIndexOf("\n", start - 1) + 1;
      const currentLine = val.substring(currentLineStart, start);

      const matchIndent = currentLine.match(/^\s*/);
      let indent = matchIndent ? matchIndent[0] : "";

      const trimmed = currentLine.trim();
      if (trimmed.endsWith("{") || trimmed.endsWith(":") || trimmed.endsWith("(")) {
        indent += "    ";
      }

      e.preventDefault();
      codeInput.value = val.substring(0, start) + "\n" + indent + val.substring(start);
      codeInput.selectionStart = codeInput.selectionEnd = start + 1 + indent.length;
    }
  });

  // Load sample code button
  loadSampleBtn.addEventListener("click", () => {
    const selectedLang = languageSelect.value;
    codeInput.value = sampleSnippets[selectedLang] || sampleSnippets["Java"];
  });

  // Clear inputs
  clearBtn.addEventListener("click", () => {
    codeInput.value = "";
    outputContainer.innerHTML = '<div class="text-secondary text-center my-auto pt-4"><p>Ready to analyze.</p><small>Paste your function or algorithm on the left, pick an analysis mode, and click <strong>Analyze Snippet</strong>.</small></div>';
    if (executionWindow) {
      executionWindow.textContent = "Ready. Output or runtime/syntax errors will appear here.";
    }
    if (statusBadge) {
      statusBadge.textContent = "Idle";
      statusBadge.className = "badge bg-secondary";
    }
    copyBtn.classList.add("d-none");
  });

  // Main Analyze Action
  analyzeBtn.addEventListener("click", async () => {
    const code = codeInput.value.trim();
    const language = languageSelect.value;
    const action = actionSelect.value;

    if (!code) {
      alert("Please paste or write code to analyze.");
      return;
    }

    let instruction = "";
    switch (action) {
      case "explain":
        instruction = "Provide a section '### Summary' with a 2-sentence overview, followed by '### Key Logic' with 3-4 bullet points.";
        break;
      case "complexity":
        instruction = "Provide '### Time Complexity' and '### Space Complexity' with Big-O notation, followed by a '### Explanation' section.";
        break;
      case "bugs":
        instruction = "Provide '### Potential Issues & Edge Cases' with 2-3 concise bullet points identifying risks or suggesting fixes.";
        break;
      case "optimize":
        instruction = "Provide '### Optimization Suggestions' with 2 concise ways to improve performance or readability.";
        break;
      default:
        instruction = "Provide '### Overview' and '### Key Details'.";
    }

    const fullPrompt = `
Analyze the following ${language} code snippet:
\`\`\`${language}
${code}
\`\`\`

Strictly structure your response using these exact delimiters:

===TERMINAL_START===
[If syntax or logical runtime errors exist in the code, print the exact error message, line number hint, and error type like a real compiler/interpreter stderr. If the code is correct, display what the simulated execution/standard output produces or what the function returns when executed with typical arguments. Keep this under 4 lines.]
===TERMINAL_END===

===ANALYSIS_START===
Task:
${instruction}
===ANALYSIS_END===

Formatting Instructions:
- Output only the delimited sections.
- Keep the terminal block raw, technical, and unadorned (do not wrap it inside markdown backticks).
`;

    btnSpinner.classList.remove("d-none");
    btnText.textContent = "Analyzing...";
    analyzeBtn.disabled = true;
    copyBtn.classList.add("d-none");
    outputContainer.innerHTML = '<span class="text-secondary">Analyzing snippet...</span>';
    
    if (executionWindow) {
      executionWindow.textContent = "Running diagnostics and executing simulation...";
    }
    if (statusBadge) {
      statusBadge.textContent = "Running";
      statusBadge.className = "badge bg-warning text-dark";
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullPrompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Extract terminal content and analysis markdown
      const terminalMatch = rawResponse.match(/===TERMINAL_START===([\s\S]*?)===TERMINAL_END===/);
      const analysisMatch = rawResponse.match(/===ANALYSIS_START===([\s\S]*?)===ANALYSIS_END===/);

      const terminalText = terminalMatch ? terminalMatch[1].trim() : "Execution completed with no standard output.";
      const analysisText = analysisMatch ? analysisMatch[1].trim() : rawResponse;

      // Update Terminal Output Window
      if (executionWindow) {
        executionWindow.textContent = terminalText;
        const isError = /error|exception|syntaxerror|typeerror|fault|traceback/i.test(terminalText);
        if (statusBadge) {
          statusBadge.textContent = isError ? "Error Detected" : "Success (0)";
          statusBadge.className = isError ? "badge bg-danger" : "badge bg-success";
        }
      }

      // Update Analysis Window
      outputContainer.innerHTML = marked.parse(analysisText);
      copyBtn.classList.remove("d-none");

    } catch (err) {
      outputContainer.innerHTML = `<span class="text-danger"><strong>Error:</strong> ${err.message}</span>`;
      if (executionWindow) {
        executionWindow.textContent = `Process terminated with error: ${err.message}`;
      }
      if (statusBadge) {
        statusBadge.textContent = "Failed";
        statusBadge.className = "badge bg-danger";
      }
    } finally {
      btnSpinner.classList.add("d-none");
      btnText.textContent = "Analyze Snippet";
      analyzeBtn.disabled = false;
    }
  });

  // Clipboard copy
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(outputContainer.innerText);
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = "Copy Output"; }, 2000);
  });
});