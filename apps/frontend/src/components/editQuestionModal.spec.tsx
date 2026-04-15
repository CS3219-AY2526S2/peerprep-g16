import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditQuestionModal from './editQuestionModal';

vi.mock('./styles', () => ({
    default: {
        modalOverlay: {},
        modalBox: {},
        modalLabel: {},
        modalInput: {},
        promoteButton: {},
    },
}));

const mockEditQuestion = {
    questionId: 'test-123',
    title: 'Test Question',
    topic: ['array', 'string'],
    difficulty: 'Medium',
    description: 'Test description',
    constraints: ['1 <= n <= 100'],
    hints: ['Think about sorting'],
    testCases: {
        sample: [{ input: '1', expectedOutput: '1' }],
        hidden: [{ input: '2', expectedOutput: '2' }],
    },
    modelAnswer: 'return 42;',
    modelAnswerTimeComplexity: 'O(n)',
    modelAnswerExplanation: 'Linear scan',
};

const setEditQuestion = vi.fn();
const setEditTopicInput = vi.fn();
const setEditConstraintInput = vi.fn();
const setEditHintInput = vi.fn();
const setEditSampleInput = vi.fn();
const setEditSampleOutput = vi.fn();
const setEditHiddenInput = vi.fn();
const setEditHiddenOutput = vi.fn();
const handleEditQuestion = vi.fn();
const setModelAnswer = vi.fn();
const setModelAnswerTimeComplexity = vi.fn();
const setModelAnswerExplanation = vi.fn();
const onClose = vi.fn();

const defaultProps = {
    show: true,
    editQuestion: mockEditQuestion,
    setEditQuestion,
    editTopicInput: '',
    setEditTopicInput,
    editConstraintInput: '',
    setEditConstraintInput,
    editHintInput: '',
    setEditHintInput,
    editSampleInput: '',
    setEditSampleInput,
    editSampleOutput: '',
    setEditSampleOutput,
    editHiddenInput: '',
    setEditHiddenInput,
    editHiddenOutput: '',
    setEditHiddenOutput,
    handleEditQuestion,
    modelAnswer: '',
    setModelAnswer,
    modelAnswerTimeComplexity: '',
    setModelAnswerTimeComplexity,
    modelAnswerExplanation: '',
    setModelAnswerExplanation,
    questionError: '',
    onClose,
};

describe('EditQuestionModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when show is false', () => {
        const { container } = render(
            <EditQuestionModal {...defaultProps} show={false} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when editQuestion is null', () => {
        const { container } = render(
            <EditQuestionModal {...defaultProps} editQuestion={null} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders modal content when show is true and editQuestion exists', () => {
        render(<EditQuestionModal {...defaultProps} />);

        expect(screen.getByText('Edit Question')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test-123')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Question')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Medium')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
        expect(screen.getByText('array')).toBeInTheDocument();
        expect(screen.getByText('string')).toBeInTheDocument();
        expect(screen.getByText('1 <= n <= 100')).toBeInTheDocument();
        expect(screen.getByText('Think about sorting')).toBeInTheDocument();
        expect(screen.getByText('Input: 1 | Output: 1')).toBeInTheDocument();
        expect(screen.getByText('Input: 2 | Output: 2')).toBeInTheDocument();
    });

    it('calls setEditQuestion with updated title', () => {
        render(<EditQuestionModal {...defaultProps} />);

        const titleInput = screen.getByDisplayValue('Test Question');
        fireEvent.change(titleInput, { target: { value: 'New Title' } });

        expect(setEditQuestion).toHaveBeenCalledWith({
            ...mockEditQuestion,
            title: 'New Title',
        });
    });

    it('calls setEditTopicInput when typing topic input', async () => {
        const user = userEvent.setup();

        render(
            <EditQuestionModal
                {...defaultProps}
                editTopicInput="existing-topic"
            />
        );

        const topicInput = screen.getByDisplayValue('existing-topic');
        await user.clear(topicInput);
        await user.type(topicInput, 'graph');

        expect(setEditTopicInput).toHaveBeenCalled();
    });

    it('adds a topic when Add is clicked', async () => {
        const user = userEvent.setup();

        render(
            <EditQuestionModal
                {...defaultProps}
                editTopicInput="graph"
            />
        );

        const addButtons = screen.getAllByRole('button', { name: 'Add' });
        await user.click(addButtons[0]);

        expect(setEditQuestion).toHaveBeenCalledWith({
            ...mockEditQuestion,
            topic: ['array', 'string', 'graph'],
        });
        expect(setEditTopicInput).toHaveBeenCalledWith('');
    });

    it('removes a topic when x is clicked', async () => {
        const user = userEvent.setup();

        render(<EditQuestionModal {...defaultProps} />);

        const removeButtons = screen.getAllByRole('button', { name: 'x' });
        await user.click(removeButtons[0]);

        expect(setEditQuestion).toHaveBeenCalledWith({
            ...mockEditQuestion,
            topic: ['string'],
        });
    });

    it('changes difficulty', () => {
        render(<EditQuestionModal {...defaultProps} />);

        const select = screen.getByDisplayValue('Medium');
        fireEvent.change(select, { target: { value: 'Hard' } });

        expect(setEditQuestion).toHaveBeenCalledWith({
            ...mockEditQuestion,
            difficulty: 'Hard',
        });
    });

    it('shows question error when provided', () => {
        render(
            <EditQuestionModal
                {...defaultProps}
                questionError="Something went wrong"
            />
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('calls handleEditQuestion when Save is clicked', async () => {
        const user = userEvent.setup();

        render(<EditQuestionModal {...defaultProps} />);

        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(handleEditQuestion).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel is clicked', async () => {
        const user = userEvent.setup();

        render(<EditQuestionModal {...defaultProps} />);

        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});