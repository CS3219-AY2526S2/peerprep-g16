import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddQuestionModal from './addQuestionModal';

const makeQuestion = () => ({
  questionId: '',
  title: '',
  topic: [] as string[],
  difficulty: '',
  description: '',
  constraints: [] as string[],
  examples: [] as { input: string; output: string; explanation?: string }[],
  hints: [] as string[],
  testCases: {
    sample: [] as { input: string; expectedOutput: string }[],
    hidden: [] as { input: string; expectedOutput: string }[],
  },
  modelAnswer: '',
  modelAnswerTimeComplexity: '',
  modelAnswerExplanation: '',
});

describe('AddQuestionModal', () => {
  const handleAddQuestion = vi.fn();
  const onClose = vi.fn();

  let newQuestion: ReturnType<typeof makeQuestion>;
  let setNewQuestion: ReturnType<typeof vi.fn>;
  let setTopicInput: ReturnType<typeof vi.fn>;
  let setConstraintInput: ReturnType<typeof vi.fn>;
  let setHintInput: ReturnType<typeof vi.fn>;
  let setSampleInput: ReturnType<typeof vi.fn>;
  let setSampleOutput: ReturnType<typeof vi.fn>;
  let setHiddenInput: ReturnType<typeof vi.fn>;
  let setHiddenOutput: ReturnType<typeof vi.fn>;
  let setModelAnswer: ReturnType<typeof vi.fn>;
  let setModelAnswerTimeComplexity: ReturnType<typeof vi.fn>;
  let setModelAnswerExplanation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    newQuestion = makeQuestion();
    setNewQuestion = vi.fn();
    setTopicInput = vi.fn();
    setConstraintInput = vi.fn();
    setHintInput = vi.fn();
    setSampleInput = vi.fn();
    setSampleOutput = vi.fn();
    setHiddenInput = vi.fn();
    setHiddenOutput = vi.fn();
    setModelAnswer = vi.fn();
    setModelAnswerTimeComplexity = vi.fn();
    setModelAnswerExplanation = vi.fn();
  });

  const renderModal = (overrides: Partial<React.ComponentProps<typeof AddQuestionModal>> = {}) =>
    render(
      <AddQuestionModal
        show={true}
        newQuestion={newQuestion}
        setNewQuestion={setNewQuestion}
        topicInput=""
        setTopicInput={setTopicInput}
        constraintInput=""
        setConstraintInput={setConstraintInput}
        hintInput=""
        setHintInput={setHintInput}
        sampleInput=""
        setSampleInput={setSampleInput}
        sampleOutput=""
        setSampleOutput={setSampleOutput}
        hiddenInput=""
        setHiddenInput={setHiddenInput}
        hiddenOutput=""
        setHiddenOutput={setHiddenOutput}
        modelAnswer=""
        setModelAnswer={setModelAnswer}
        modelAnswerTimeComplexity=""
        setModelAnswerTimeComplexity={setModelAnswerTimeComplexity}
        modelAnswerExplanation=""
        setModelAnswerExplanation={setModelAnswerExplanation}
        handleAddQuestion={handleAddQuestion}
        questionError=""
        onClose={onClose}
        {...overrides}
      />
    );

  it('renders nothing when show is false', () => {
    renderModal({ show: false });
    expect(screen.queryByText(/add new question/i)).not.toBeInTheDocument();
  });

  it('renders the modal when show is true', () => {
    renderModal();
    expect(screen.getByText(/add new question/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('updates question id and title through setNewQuestion', () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/question id/i), {
      target: { value: 'Q001' },
    });

    fireEvent.change(screen.getByLabelText(/^title:/i), {
      target: { value: 'Two Sum' },
    });

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'Q001' })
    );
    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Two Sum' })
    );
  });

  it('updates difficulty and description', () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/difficulty/i), {
      target: { value: 'Medium' },
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Find two numbers that add up to target' },
    });

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty: 'Medium' })
    );
    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Find two numbers that add up to target',
      })
    );
  });

  it('adds a topic', async () => {
    const user = userEvent.setup();

    renderModal({ topicInput: 'Arrays' });

    const addButtons = screen.getAllByRole('button', { name: /add/i });
    await user.click(addButtons[0]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ topic: ['Arrays'] })
    );
    expect(setTopicInput).toHaveBeenCalledWith('');
  });

  it('removes a topic', async () => {
    const user = userEvent.setup();
    newQuestion = { ...newQuestion, topic: ['Arrays', 'Hash Map'] };

    renderModal();

    const removeButtons = screen.getAllByRole('button', { name: 'x' });
    await user.click(removeButtons[0]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ topic: ['Hash Map'] })
    );
  });

  it('adds a constraint', async () => {
    const user = userEvent.setup();

    renderModal({ constraintInput: '1 <= n <= 10^5' });

    const addButtons = screen.getAllByRole('button', { name: /add/i });
    await user.click(addButtons[1]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ constraints: ['1 <= n <= 10^5'] })
    );
    expect(setConstraintInput).toHaveBeenCalledWith('');
  });

  it('adds a hint', async () => {
    const user = userEvent.setup();

    renderModal({ hintInput: 'Use a hash map' });

    const addButtons = screen.getAllByRole('button', { name: /add/i });
    await user.click(addButtons[2]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ hints: ['Use a hash map'] })
    );
    expect(setHintInput).toHaveBeenCalledWith('');
  });

  it('adds a sample test case', async () => {
    const user = userEvent.setup();

    renderModal({
      sampleInput: '2 7 11 15\n9',
      sampleOutput: '[0,1]',
    });

    const addButtons = screen.getAllByRole('button', { name: /add/i });
    await user.click(addButtons[3]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: expect.objectContaining({
          sample: [{ input: '2 7 11 15\n9', expectedOutput: '[0,1]' }],
        }),
      })
    );
    expect(setSampleInput).toHaveBeenCalledWith('');
    expect(setSampleOutput).toHaveBeenCalledWith('');
  });

  it('adds a hidden test case', async () => {
    const user = userEvent.setup();

    renderModal({
      hiddenInput: '3 2 4\n6',
      hiddenOutput: '[1,2]',
    });

    const addButtons = screen.getAllByRole('button', { name: /add/i });
    await user.click(addButtons[4]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: expect.objectContaining({
          hidden: [{ input: '3 2 4\n6', expectedOutput: '[1,2]' }],
        }),
      })
    );
    expect(setHiddenInput).toHaveBeenCalledWith('');
    expect(setHiddenOutput).toHaveBeenCalledWith('');
  });

  it('removes a sample test case', async () => {
    const user = userEvent.setup();
    newQuestion = {
      ...newQuestion,
      testCases: {
        sample: [{ input: '1 2 3', expectedOutput: '6' }],
        hidden: [],
      },
    };

    renderModal();

    const removeButtons = screen.getAllByRole('button', { name: 'x' });
    await user.click(removeButtons[0]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: expect.objectContaining({
          sample: [],
        }),
      })
    );
  });

  it('removes a hidden test case', async () => {
    const user = userEvent.setup();
    newQuestion = {
      ...newQuestion,
      testCases: {
        sample: [],
        hidden: [{ input: '4 5 6', expectedOutput: '15' }],
      },
    };

    renderModal();

    const removeButtons = screen.getAllByRole('button', { name: 'x' });
    await user.click(removeButtons[0]);

    expect(setNewQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: expect.objectContaining({
          hidden: [],
        }),
      })
    );
  });

  it('calls submit handler', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleAddQuestion).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error message when questionError is provided', () => {
    renderModal({ questionError: 'Question ID already exists' });
    expect(screen.getByText(/question id already exists/i)).toBeInTheDocument();
  });
});