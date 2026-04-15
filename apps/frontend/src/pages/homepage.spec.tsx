import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { AxiosResponse } from 'axios';

interface MatchStatusResponse {
  status: string;
  message?: string;
  preferences?: { topic?: string; difficulty?: string };
  elapsed?: number;
  roomId?: string;
}

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api/axiosInstance', () => ({
  default: mockApi,
}));

vi.mock('../components/styles', () => ({
  default: {},
}));

vi.mock('../components/matchmakingOverlay', () => ({
  default: ({
    onCancel,
    onDismiss,
  }: {
    isTimeout: boolean;
    matchStatus: string;
    elapsed: number;
    topic: string;
    difficulty: string;
    onCancel: () => void;
    onDismiss: () => void;
    isRedirecting: boolean;
  }) => (
    <div data-testid="matchmaking-overlay">
      <div>Matchmaking Overlay</div>
      <button data-testid="cancel-btn" onClick={onCancel}>Cancel</button>
      <button data-testid="dismiss-btn" onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

vi.mock('../components/topicSelectionOverlay', () => ({
  default: ({ onDismiss }: { onDismiss: () => void; selected: boolean }) => (
    <div data-testid="topic-overlay">
      <div>Topic Selection Overlay</div>
      <button data-testid="topic-dismiss" onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

vi.mock('../api/collaborationService', () => ({
  getActiveSession: vi.fn().mockResolvedValue(null),
  rejoinSession: vi.fn().mockResolvedValue({}),
}));

import Homepage from './homepage';

const asAxiosResponse = <T,>(data: T): AxiosResponse<T> =>
  ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} },
  }) as AxiosResponse<T>;

const topicsResponse = (topics: string[]) => asAxiosResponse({ topics });
const matchStatusResponse = (payload: MatchStatusResponse) => asAxiosResponse(payload);
const idlePeekResponse = () => matchStatusResponse({ status: 'idle' });

const renderHomepage = () =>
  render(
    <MemoryRouter>
      <Homepage />
    </MemoryRouter>
  );

const getTopicSelect = () => document.querySelector('select') as HTMLSelectElement;

describe('Homepage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders main page heading and filters', async () => {
    mockApi.get.mockResolvedValueOnce(topicsResponse([]));

    renderHomepage();

    expect(screen.getByText('Main Page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Matchmake/i })).toBeInTheDocument();

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(1));
  });

  it('loads topics on mount', async () => {
    mockApi.get.mockResolvedValueOnce(topicsResponse(['Arrays', 'Strings']));

    renderHomepage();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/questions/topics')
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Arrays' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Strings' })).toBeInTheDocument();
    });
  });

  it('shows topic error overlay when matchmaking without topic', async () => {
    mockApi.get.mockResolvedValueOnce(topicsResponse([]));

    renderHomepage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Matchmake/i })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole('button', { name: /Matchmake/i }));

    expect(screen.getByTestId('topic-overlay')).toBeInTheDocument();
  });

  it('dismisses topic error overlay', async () => {
    mockApi.get.mockResolvedValueOnce(topicsResponse([]));

    renderHomepage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Matchmake/i })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole('button', { name: /Matchmake/i }));
    expect(screen.getByTestId('topic-overlay')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('topic-dismiss'));
    expect(screen.queryByTestId('topic-overlay')).not.toBeInTheDocument();
  });

  it('starts matchmaking with valid topic', async () => {
    localStorage.setItem(
      'login',
      JSON.stringify({ id: 'user123', username: 'testuser', isAdmin: false })
    );

    mockApi.get
      .mockResolvedValueOnce(topicsResponse(['Arrays']))  // fetchTopics
      .mockResolvedValueOnce(idlePeekResponse())          // checkExistingQueue peek
      .mockResolvedValueOnce(asAxiosResponse({}));        // verify-token

    mockApi.post.mockResolvedValueOnce(
      matchStatusResponse({ status: 'waiting', message: 'Searching...' })
    );

    renderHomepage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Arrays' })).toBeInTheDocument();
    });

    await userEvent.selectOptions(getTopicSelect(), 'Arrays');
    await userEvent.click(screen.getByRole('button', { name: /Matchmake/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/match'),
        {
          userId: 'user123',
          username: 'testuser',
          topic: 'Arrays',
          difficulty: '',
        }
      );
    });

    expect(screen.getByTestId('matchmaking-overlay')).toBeInTheDocument();
  });

  it('cancels matchmaking', async () => {
    localStorage.setItem(
      'login',
      JSON.stringify({ id: 'user123', username: 'testuser' })
    );

    mockApi.get
      .mockResolvedValueOnce(topicsResponse(['Arrays']))                    // fetchTopics
      .mockResolvedValueOnce(idlePeekResponse())                            // checkExistingQueue peek
      .mockResolvedValueOnce(asAxiosResponse({}))                           // verify-token
      .mockResolvedValueOnce(matchStatusResponse({ status: 'waiting' }));   // cancelMatchmaking status check

    mockApi.post.mockResolvedValueOnce(
      matchStatusResponse({ status: 'waiting', message: 'Searching...' })
    );
    mockApi.delete.mockResolvedValueOnce(asAxiosResponse({}));

    renderHomepage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Arrays' })).toBeInTheDocument();
    });

    await userEvent.selectOptions(getTopicSelect(), 'Arrays');
    await userEvent.click(screen.getByRole('button', { name: /Matchmake/i }));

    await waitFor(() => {
      expect(screen.getByTestId('matchmaking-overlay')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('cancel-btn'));

    await waitFor(() => {
      expect(mockApi.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/match/user123')
      );
    });
  });

  it('detects existing queue on mount', async () => {
    localStorage.setItem(
      'login',
      JSON.stringify({ id: 'user123', username: 'testuser' })
    );

    mockApi.get
      .mockResolvedValueOnce(topicsResponse(['Arrays']))  // fetchTopics
      .mockResolvedValueOnce(
        matchStatusResponse({
          status: 'waiting',
          message: 'Searching...',
          preferences: { topic: 'Arrays', difficulty: 'Easy' },
          elapsed: 5000,
        })
      );

    renderHomepage();

    await waitFor(() => {
      expect(screen.getByTestId('matchmaking-overlay')).toBeInTheDocument();
    });
  });

  it('handles admin user detection', async () => {
    localStorage.setItem(
      'login',
      JSON.stringify({ id: 'user123', username: 'testuser', isAdmin: true })
    );

    mockApi.get
      .mockResolvedValueOnce(topicsResponse(['Arrays']))  // fetchTopics
      .mockResolvedValueOnce(idlePeekResponse())          // checkExistingQueue peek
      .mockResolvedValueOnce(asAxiosResponse({}));        // verify-token succeeds

    renderHomepage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Arrays' })).toBeInTheDocument();
    });

    await userEvent.selectOptions(getTopicSelect(), 'Arrays');
    await userEvent.click(screen.getByRole('button', { name: /Matchmake/i }));

    await waitFor(() => {
      expect(localStorage.getItem('login')).toBeNull();
    });
  });
});
