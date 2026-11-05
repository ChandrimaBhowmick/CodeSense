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

  // Sample templates for quick testing
  const sampleSnippets = {
    Java: `public class BinarySearch {\n    public static int search(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n}`,
    Python: `def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
    "C++": `int binarySearch(const std::vector<int>& nums, int target) {\n    int left = 0, right = nums.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] == target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}`,
    JavaScript: `function binarySearch(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor(left + (right - left) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}`,
    PHP: `function binarySearch($nums, $target) {\n    $left = 0;\n    $right = count($nums) - 1;\n    while ($left <= $right) {\n        $mid = intdiv($left + $right, 2);\n        if ($nums[$mid] === $target) return $mid;\n        if ($nums[$mid] < $target) $left = $mid + 1;\n        else $right = $mid - 1;\n    }\n    return -1;\n}`
  };

  // Support Tab key inside the code textarea
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = codeInput.selectionStart;
      const end = codeInput.selectionEnd;
      codeInput.value = codeInput.value.substring(0, start) + "    " + codeInput.value.substring(end);
      codeInput.selectionStart = codeInput.selectionEnd = start + 4;
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
    outputContainer.innerHTML = '<div class="text-secondary text-center my-auto pt-5"><p>Ready to analyze.</p></div>';
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

Task:
${instruction}

Formatting Instructions:
- Output only the final response formatted in clean Markdown.
- Do not print checklists, internal reflections, self-evaluations, or rules.
- Be direct, technical, and concise.
`;

    btnSpinner.classList.remove("d-none");
    btnText.textContent = "Analyzing...";
    analyzeBtn.disabled = true;
    copyBtn.classList.add("d-none");
    outputContainer.innerHTML = '<span class="text-secondary">Analyzing snippet with Gemini...</span>';

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

      const generatedMarkdown = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedMarkdown) {
        outputContainer.innerHTML = marked.parse(generatedMarkdown);
        copyBtn.classList.remove("d-none");
      } else {
        outputContainer.innerHTML = '<span class="text-danger">No response received. Please check your snippet and try again.</span>';
      }
    } catch (err) {
      outputContainer.innerHTML = `<span class="text-danger"><strong>Error:</strong> ${err.message}</span>`;
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