import React from "react";

// Define types for our diff segments
interface DiffSegment {
  text: string;
  type: "same" | "added" | "deleted";
}

// Props interface for the DiffViewer component
interface DiffViewerProps {
  original: string;
  modified: string;
  className?: string;
}

// Function to compare two strings and return an array of segments with diff info
const getTextDiff = (
  originalText: string,
  modifiedText: string
): DiffSegment[] => {
  // Simple tokenization by splitting the text into words and spaces
  const tokenize = (text: string): string[] => {
    // This regex splits text into words and non-words (spaces, punctuation, etc.)
    return text.match(/\S+|\s+/g) || [];
  };

  const originalTokens = tokenize(originalText);
  const modifiedTokens = tokenize(modifiedText);

  // Dynamic programming approach for longest common subsequence
  const matrix: number[][] = Array(originalTokens.length + 1)
    .fill(0)
    .map(() => Array(modifiedTokens.length + 1).fill(0));

  // Fill the matrix
  for (let i = 1; i <= originalTokens.length; i++) {
    for (let j = 1; j <= modifiedTokens.length; j++) {
      if (originalTokens[i - 1] === modifiedTokens[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  // Backtrack to find the diff
  const diff: DiffSegment[] = [];
  let i = originalTokens.length;
  let j = modifiedTokens.length;

  while (i > 0 && j > 0) {
    if (originalTokens[i - 1] === modifiedTokens[j - 1]) {
      diff.unshift({ text: originalTokens[i - 1], type: "same" });
      i--;
      j--;
    } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
      diff.unshift({ text: originalTokens[i - 1], type: "deleted" });
      i--;
    } else {
      diff.unshift({ text: modifiedTokens[j - 1], type: "added" });
      j--;
    }
  }

  // Add remaining tokens
  while (i > 0) {
    diff.unshift({ text: originalTokens[i - 1], type: "deleted" });
    i--;
  }

  while (j > 0) {
    diff.unshift({ text: modifiedTokens[j - 1], type: "added" });
    j--;
  }

  return diff;
};

// Function to merge adjacent segments of the same type for cleaner rendering
const mergeAdjacentSegments = (diff: DiffSegment[]): DiffSegment[] => {
  const merged: DiffSegment[] = [];
  let currentSegment: DiffSegment | null = null;

  for (const segment of diff) {
    if (!currentSegment) {
      currentSegment = { ...segment };
    } else if (currentSegment.type === segment.type) {
      currentSegment.text += segment.text;
    } else {
      merged.push(currentSegment);
      currentSegment = { ...segment };
    }
  }

  if (currentSegment) {
    merged.push(currentSegment);
  }

  return merged;
};

// Helper function to check if a line has meaningful changes (not just whitespace)
const hasSignificantChanges = (diff: DiffSegment[]): boolean => {
  return diff.some(
    (segment) =>
      (segment.type === "added" || segment.type === "deleted") &&
      segment.text.trim().length > 0
  );
};

// Helper function to render word-level diffs
const renderWordLevelDiff = (
  originalLine: string,
  modifiedLine: string
): {
  originalSegments: React.ReactNode;
  modifiedSegments: React.ReactNode;
  hasChanges: boolean;
} => {
  // Use the existing word-level diff algorithm
  const wordDiff = getTextDiff(originalLine, modifiedLine);
  const mergedDiff = mergeAdjacentSegments(wordDiff);

  // Check if there are actual changes
  const hasChanges = hasSignificantChanges(mergedDiff);

  // Render original line with deletions highlighted
  const originalSegments = mergedDiff
    .map((segment: DiffSegment, idx: number) => {
      if (segment.type === "deleted") {
        return (
          <span
            key={idx}
            style={{
              backgroundColor: "#ffecec",
              color: "#b30000",
              textDecoration: "line-through",
            }}
          >
            {segment.text}
          </span>
        );
      } else if (segment.type === "same") {
        return <span key={idx}>{segment.text}</span>;
      }
      return null;
    })
    .filter(Boolean);

  // Render modified line with additions highlighted
  const modifiedSegments = mergedDiff
    .map((segment: DiffSegment, idx: number) => {
      if (segment.type === "added") {
        return (
          <span
            key={idx}
            style={{
              backgroundColor: "#eaffea",
              color: "#006700",
            }}
          >
            {segment.text}
          </span>
        );
      } else if (segment.type === "same") {
        return <span key={idx}>{segment.text}</span>;
      }
      return null;
    })
    .filter(Boolean);

  return {
    originalSegments,
    modifiedSegments,
    hasChanges,
  };
};

// Simplified and more reliable line diff using a different approach
const getLineDiff = (originalLines: string[], modifiedLines: string[]) => {
  const result = [];

  // Create a simple edit script using dynamic programming
  const dp = Array(originalLines.length + 1)
    .fill(null)
    .map(() => Array(modifiedLines.length + 1).fill(0));

  // Fill the DP table
  for (let i = 0; i <= originalLines.length; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= modifiedLines.length; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= originalLines.length; i++) {
    for (let j = 1; j <= modifiedLines.length; j++) {
      if (originalLines[i - 1] === modifiedLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j], // deletion
            dp[i][j - 1], // insertion
            dp[i - 1][j - 1] // substitution
          );
      }
    }
  }

  // Trace back to get the operations
  const operations = [];
  let i = originalLines.length;
  let j = modifiedLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
      operations.unshift({
        type: "equal",
        originalIndex: i - 1,
        modifiedIndex: j - 1,
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      // Substitution
      operations.unshift({
        type: "replace",
        originalIndex: i - 1,
        modifiedIndex: j - 1,
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      // Deletion
      operations.unshift({
        type: "delete",
        originalIndex: i - 1,
        modifiedIndex: -1,
      });
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      // Insertion
      operations.unshift({
        type: "insert",
        originalIndex: -1,
        modifiedIndex: j - 1,
      });
      j--;
    }
  }

  // Convert operations to display format
  let originalLineNum = 1;
  let modifiedLineNum = 1;

  for (const op of operations) {
    if (op.type === "equal") {
      result.push({
        type: "same",
        originalLine: originalLines[op.originalIndex],
        modifiedLine: modifiedLines[op.modifiedIndex],
        originalLineNumber: originalLineNum,
        modifiedLineNumber: modifiedLineNum,
      });
      originalLineNum++;
      modifiedLineNum++;
    } else if (op.type === "delete") {
      result.push({
        type: "deleted",
        originalLine: originalLines[op.originalIndex],
        modifiedLine: "",
        originalLineNumber: originalLineNum,
        modifiedLineNumber: null,
      });
      originalLineNum++;
    } else if (op.type === "insert") {
      result.push({
        type: "added",
        originalLine: "",
        modifiedLine: modifiedLines[op.modifiedIndex],
        originalLineNumber: null,
        modifiedLineNumber: modifiedLineNum,
      });
      modifiedLineNum++;
    } else if (op.type === "replace") {
      // For replacements, use word-level diffing
      const originalLine = originalLines[op.originalIndex];
      const modifiedLine = modifiedLines[op.modifiedIndex];

      const { originalSegments, modifiedSegments, hasChanges } =
        renderWordLevelDiff(originalLine, modifiedLine);

      if (hasChanges) {
        result.push({
          type: "modified",
          originalLine,
          modifiedLine,
          originalSegments,
          modifiedSegments,
          originalLineNumber: originalLineNum,
          modifiedLineNumber: modifiedLineNum,
        });
      } else {
        result.push({
          type: "same",
          originalLine,
          modifiedLine,
          originalLineNumber: originalLineNum,
          modifiedLineNumber: modifiedLineNum,
        });
      }
      originalLineNum++;
      modifiedLineNum++;
    }
  }

  return result;
};

// Main DiffViewer component
const DiffViewer: React.FC<DiffViewerProps> = ({
  original,
  modified,
  className = "",
}) => {
  // Handle empty content cases
  if (!original && !modified) {
    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          color: "#718096",
          fontStyle: "italic",
          backgroundColor: "#f7fafc",
        }}
        className={className}
      >
        No content available for diff view
      </div>
    );
  }

  // Split content into lines
  const originalLines = (original || "").split("\n");
  const modifiedLines = (modified || "").split("\n");

  // Get line-level diff
  const lineDiffs = getLineDiff(originalLines, modifiedLines);

  // Create the diff rows
  const diffRows = lineDiffs.map((diff, index) => {
    const rowStyle = {
      display: "flex",
      marginBottom: "2px",
      backgroundColor: diff.type !== "same" ? "#f8f8f8" : "transparent",
    };

    const lineNumberStyle = {
      width: "50px",
      color: "#999",
      textAlign: "right" as const,
      paddingRight: "10px",
      userSelect: "none" as const,
      fontSize: "12px",
    };

    const lineStyle = {
      flex: 1,
      padding: "0 5px",
      whiteSpace: "pre-wrap" as const,
      wordBreak: "break-word" as const,
    };

    if (diff.type === "same") {
      return (
        <div key={`same-${index}`} style={rowStyle}>
          <div style={lineNumberStyle}>{diff.originalLineNumber}</div>
          <div style={lineStyle}>{diff.originalLine}</div>
          <div style={lineStyle}>{diff.modifiedLine}</div>
        </div>
      );
    } else if (diff.type === "modified") {
      return (
        <div key={`modified-${index}`} style={rowStyle}>
          <div style={lineNumberStyle}>{diff.originalLineNumber}</div>
          <div style={lineStyle}>{diff.originalSegments}</div>
          <div style={lineStyle}>{diff.modifiedSegments}</div>
        </div>
      );
    } else if (diff.type === "deleted") {
      return (
        <div key={`deleted-${index}`} style={rowStyle}>
          <div style={lineNumberStyle}>{diff.originalLineNumber}</div>
          <div style={lineStyle}>
            <span
              style={{
                backgroundColor: "#ffecec",
                color: "#b30000",
                textDecoration: "line-through",
              }}
            >
              {diff.originalLine}
            </span>
          </div>
          <div style={lineStyle}></div>
        </div>
      );
    } else if (diff.type === "added") {
      return (
        <div key={`added-${index}`} style={rowStyle}>
          <div style={lineNumberStyle}>{diff.modifiedLineNumber}</div>
          <div style={lineStyle}></div>
          <div style={lineStyle}>
            <span
              style={{
                backgroundColor: "#eaffea",
                color: "#006700",
              }}
            >
              {diff.modifiedLine}
            </span>
          </div>
        </div>
      );
    }

    return null;
  });

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: "14px",
      }}
      className={className}
    >
      <div
        style={{
          display: "flex",
          backgroundColor: "#f0f0f0",
          borderBottom: "1px solid #ccc",
          padding: "8px",
        }}
      >
        <div
          style={{
            flex: 1,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Original
        </div>
        <div
          style={{
            flex: 1,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Modified
        </div>
      </div>
      <div style={{ padding: "8px" }}>{diffRows}</div>
    </div>
  );
};

// Demo component to test the diff viewer
const DiffDemo = () => {
  const [original, setOriginal] = React.useState(
    "Hello worlds\nThis is a test\nAnother line here\nFinal line"
  );
  const [modified, setModified] = React.useState(
    "Hello world\nNellie added\nThis is a test\nAnother line here\nFinal line"
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px", backgroundColor: "#f5f5f5" }}>
        <h2 style={{ margin: "0 0 15px 0" }}>Diff Viewer Test</h2>
        <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Original Text:
            </label>
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              style={{
                width: "100%",
                height: "100px",
                fontFamily: "monospace",
                fontSize: "14px",
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Modified Text:
            </label>
            <textarea
              value={modified}
              onChange={(e) => setModified(e.target.value)}
              style={{
                width: "100%",
                height: "100px",
                fontFamily: "monospace",
                fontSize: "14px",
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          border: "1px solid #ccc",
          margin: "0 20px 20px 20px",
        }}
      >
        <DiffViewer
          original={original}
          modified={modified}
          className="demo-diff"
        />
      </div>
    </div>
  );
};

export default DiffViewer;
