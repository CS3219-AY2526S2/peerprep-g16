import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadJSONFile from "./uploadJSONFile";

// ─── Polyfill File.prototype.text (not implemented in jsdom) ─────────────────
if (!File.prototype.text) {
    File.prototype.text = function (): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(this);
        });
    };
}

// ─── Mock window.alert globally ───────────────────────────────────────────────
beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Mock styles to avoid import issues
vi.mock("./styles", () => ({
    default: {
        modalOverlay: {},
        modalBox: {},
        exampleBox: {},
        examplePre: {},
        previewContainer: {},
        previewScroll: {},
        previewCard: {},
        previewCardHeader: {},
        previewCardBody: {},
        previewNestedCard: {},
        previewCodeBlock: {},
        successBox: {},
        errorBox: {},
        uploadButtonRow: {},
        addQuestionButton: {},
        button: {},
        acceptButton: {},
    },
}));

const baseProps = {
    show: true,
    onClose: vi.fn(),
    onUpload: vi.fn(),
    questionError: "",
    questionSuccess: "",
};

const sampleQuestion = [
    {
        questionId: "q1",
        title: "Two Sum",
        topic: ["Arrays", "Hash Map"],
        difficulty: "Easy",
        description: "Given an array, return indices of two numbers that add to target.",
        constraints: ["2 <= n <= 10^4"],
        examples: [{ input: "[2,7,11,15], 9", output: "[0,1]", explanation: "2 + 7 = 9" }],
        hints: ["Use a hash map."],
        testCases: {
            sample: [{ input: "2 7\n9", expectedOutput: "0 1" }],
            hidden: [{ input: "3 3\n6", expectedOutput: "0 1" }],
        },
        modelAnswer: "function twoSum(nums, target) { return [0, 1]; }",
        modelAnswerTimeComplexity: "O(n)",
        modelAnswerExplanation: "Single pass hash map.",
    },
];

function makeJsonFile(data: unknown, name = "questions.json"): File {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    return new File([blob], name, { type: "application/json" });
}

// Helper to upload a file through the hidden input
async function uploadFile(file: File) {
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, file);
}

// ─── Visibility ──────────────────────────────────────────────────────────────

describe("visibility", () => {
    it("renders nothing when show is false", () => {
        const { container } = render(<UploadJSONFile {...baseProps} show={false} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders the modal when show is true", () => {
        render(<UploadJSONFile {...baseProps} />);
        expect(screen.getByText("Upload Questions via JSON")).toBeInTheDocument();
    });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe("initial state", () => {
    beforeEach(() => render(<UploadJSONFile {...baseProps} />));

    it("shows the example format JSON", () => {
        expect(screen.getByText("Example Format:")).toBeInTheDocument();
    });

    it("shows the Choose JSON File label", () => {
        expect(screen.getByText("Choose JSON File")).toBeInTheDocument();
    });

    it("shows a Cancel button", () => {
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("does not show Confirm Upload button before file selection", () => {
        expect(screen.queryByRole("button", { name: "Confirm Upload" })).toBeNull();
    });
});

// ─── File upload & preview ────────────────────────────────────────────────────

describe("file upload and preview", () => {
    beforeEach(() => render(<UploadJSONFile {...baseProps} />));

    it("shows preview after valid JSON file is selected", async () => {
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() =>
            expect(screen.getByText(/1 question found/i)).toBeInTheDocument()
        );
    });

    it("displays filename in preview header", async () => {
        await uploadFile(makeJsonFile(sampleQuestion, "my-questions.json"));
        await waitFor(() =>
            expect(screen.getByText("my-questions.json")).toBeInTheDocument()
        );
    });

    it("shows question title and difficulty in the preview card", async () => {
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => {
            expect(screen.getByText(/Two Sum/)).toBeInTheDocument();
            expect(screen.getByText(/Easy/)).toBeInTheDocument();
        });
    });

    it("wraps a single object (non-array) JSON in an array", async () => {
        await uploadFile(makeJsonFile(sampleQuestion[0]));
        await waitFor(() =>
            expect(screen.getByText(/1 question found/i)).toBeInTheDocument()
        );
    });

    it("shows plural 'questions' for multiple questions", async () => {
        const two = [sampleQuestion[0], { ...sampleQuestion[0], questionId: "q2", title: "Three Sum" }];
        await uploadFile(makeJsonFile(two));
        await waitFor(() =>
            expect(screen.getByText(/2 questions found/i)).toBeInTheDocument()
        );
    });

    it("alerts and does not show preview for invalid JSON", async () => {
        const badFile = new File(["not json {{"], "bad.json", { type: "application/json" });
        await uploadFile(badFile);
        await waitFor(() =>
            expect(window.alert).toHaveBeenCalledWith("Invalid JSON file. Please check the format.")
        );
        expect(screen.queryByText(/question found/i)).toBeNull();
    });
});

// ─── Expand / collapse ────────────────────────────────────────────────────────

describe("expand and collapse question cards", () => {
    beforeEach(async () => {
        render(<UploadJSONFile {...baseProps} />);
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByText(/Two Sum/));
    });

    it("expands a question card on click", async () => {
        fireEvent.click(screen.getByText(/Two Sum/));
        await waitFor(() =>
            expect(screen.getByText(/Given an array, return indices/)).toBeInTheDocument()
        );
    });

    it("collapses a card when clicked again", async () => {
        const header = screen.getByText(/Two Sum/).closest("div")!;
        fireEvent.click(header);
        await waitFor(() => screen.getByText(/Given an array/));
        fireEvent.click(header);
        await waitFor(() =>
            expect(screen.queryByText(/Given an array/)).toBeNull()
        );
    });

    it("shows topic when expanded", async () => {
        fireEvent.click(screen.getByText(/Two Sum/));
        await waitFor(() =>
            expect(screen.getByText(/Arrays, Hash Map/)).toBeInTheDocument()
        );
    });

    it("shows examples when expanded", async () => {
        fireEvent.click(screen.getByText(/Two Sum/));
        await waitFor(() =>
            expect(screen.getByText(/\[2,7,11,15\]/)).toBeInTheDocument()
        );
    });

    it("shows hidden test case count when expanded", async () => {
        fireEvent.click(screen.getByText(/Two Sum/));
        await waitFor(() =>
            expect(screen.getByText(/1 case/i)).toBeInTheDocument()
        );
    });

    it("shows model answer when expanded", async () => {
        fireEvent.click(screen.getByText(/Two Sum/));
        await waitFor(() =>
            expect(screen.getByText(/function twoSum/)).toBeInTheDocument()
        );
    });

    it("shows time complexity when expanded", async () => {
        fireEvent.click(screen.getByText(/Two Sum/));
        await waitFor(() =>
            expect(screen.getByText(/O\(n\)/)).toBeInTheDocument()
        );
    });
});

// ─── Reselect ─────────────────────────────────────────────────────────────────

describe("reselect", () => {
    it("resets to initial state when Reselect is clicked", async () => {
        render(<UploadJSONFile {...baseProps} />);
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByRole("button", { name: "Reselect" }));

        fireEvent.click(screen.getByRole("button", { name: "Reselect" }));

        await waitFor(() => {
            expect(screen.getByText("Example Format:")).toBeInTheDocument();
            expect(screen.queryByText(/question found/i)).toBeNull();
        });
    });
});

// ─── Confirm upload ───────────────────────────────────────────────────────────

describe("confirm upload", () => {
    beforeEach(async () => {
        render(<UploadJSONFile {...baseProps} />);
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByRole("button", { name: "Confirm Upload" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm Upload" }));
    });

    it("calls onUpload with the file event when Confirm Upload is clicked", () => {
        expect(baseProps.onUpload).toHaveBeenCalledTimes(1);
    });

    it("hides the Confirm Upload button after confirmation", () => {
        expect(screen.queryByRole("button", { name: "Confirm Upload" })).toBeNull();
    });
});

// ─── Success state ────────────────────────────────────────────────────────────

describe("success state", () => {
    it("displays success message after confirmed upload", async () => {
        render(
            <UploadJSONFile
                {...baseProps}
                questionSuccess="2 question(s) uploaded successfully."
            />
        );
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByRole("button", { name: "Confirm Upload" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm Upload" }));

        await waitFor(() =>
            expect(screen.getByText("2 question(s) uploaded successfully.")).toBeInTheDocument()
        );
    });

    it("shows Done button on success", async () => {
        render(
            <UploadJSONFile
                {...baseProps}
                questionSuccess="Uploaded."
            />
        );
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByRole("button", { name: "Confirm Upload" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm Upload" }));

        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
        );
    });

    it("calls onClose when Done is clicked", async () => {
        const onClose = vi.fn();
        render(
            <UploadJSONFile
                {...baseProps}
                onClose={onClose}
                questionSuccess="Uploaded."
            />
        );
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByRole("button", { name: "Confirm Upload" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm Upload" }));
        await waitFor(() => screen.getByRole("button", { name: "Done" }));
        fireEvent.click(screen.getByRole("button", { name: "Done" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe("error state", () => {
    async function renderWithError(errorMsg: string) {
        render(
            <UploadJSONFile
                {...baseProps}
                questionError={errorMsg}
            />
        );
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByRole("button", { name: "Confirm Upload" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm Upload" }));
    }

    it("displays the primary error message", async () => {
        await renderWithError("Upload failed.\nField 'title' is required.\nField 'difficulty' is required.");
        await waitFor(() =>
            expect(screen.getByText("Upload failed.")).toBeInTheDocument()
        );
    });

    it("displays each line of a multi-line error as a bullet", async () => {
        await renderWithError("Upload failed.\nField 'title' is required.\nField 'difficulty' is required.");
        await waitFor(() => {
            expect(screen.getByText(/Field 'title' is required\./)).toBeInTheDocument();
            expect(screen.getByText(/Field 'difficulty' is required\./)).toBeInTheDocument();
        });
    });

    it("shows Try Again and Cancel buttons on error", async () => {
        await renderWithError("Upload failed.");
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        });
    });

    it("resets to initial state when Try Again is clicked", async () => {
        await renderWithError("Upload failed.");
        await waitFor(() => screen.getByRole("button", { name: "Try Again" }));
        fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

        await waitFor(() =>
            expect(screen.getByText("Example Format:")).toBeInTheDocument()
        );
    });
});

// ─── Cancel ───────────────────────────────────────────────────────────────────

describe("cancel button", () => {
    it("calls onClose when Cancel is clicked before file selection", () => {
        const onClose = vi.fn();
        render(<UploadJSONFile {...baseProps} onClose={onClose} />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Cancel is clicked during preview", async () => {
        const onClose = vi.fn();
        render(<UploadJSONFile {...baseProps} onClose={onClose} />);
        await uploadFile(makeJsonFile(sampleQuestion));
        await waitFor(() => screen.getByRole("button", { name: "Confirm Upload" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});