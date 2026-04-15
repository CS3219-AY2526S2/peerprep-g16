import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Register from './register';
import api from '../api/axiosInstance';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('../api/axiosInstance', () => ({
    default: {
        post: vi.fn(),
    },
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>(
        'react-router-dom'
    );

    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('Register', () => {
    let unmount: () => void;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubEnv('VITE_USER_SERVICE_URL', 'http://localhost:3000');
    });

    afterEach(() => {
        if (unmount) unmount();
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    const renderComponent = () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const { unmount } = render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>,
            { container }
        );
        return { unmount };
    };

    it('renders the registration form', () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;

        expect(screen.getByText('User Registration')).toBeInTheDocument();
        expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email:/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText(/password:/i)).toHaveLength(2);
        expect(
            screen.getByRole('button', { name: /register/i })
        ).toBeInTheDocument();
    });

    it('shows error for invalid email', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'invalid-email');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(
            screen.getByText('Please enter a valid email address.')
        ).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Pass1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Pass1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(
            screen.getByText('Password must be at least 8 characters long.')
        ).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when password lacks uppercase letter', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'password1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'password1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(
            screen.getByText('Password must contain at least 1 Uppercase letter.')
        ).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when password lacks lowercase letter', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'PASSWORD1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'PASSWORD1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(
            screen.getByText('Password must contain at least 1 lowercase letter.')
        ).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when password lacks number', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(
            screen.getByText('Password must contain at least 1 number.')
        ).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when password lacks special character', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password1');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password1');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(
            screen.getByText(
                'Password must contain at least 1 special character (@$!%*?&).'
            )
        ).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password2@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(screen.getByText("Passwords don't match!")).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('submits registration successfully', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                expect.stringContaining('users'), // match ANY path ending the same
                {
                    username: 'alice',
                    email: 'alice@email.com',
                    password: 'Password1@',
                }
            );
        });

        expect(
            await screen.findByText('Registration successful! Redirecting to login...')
        ).toBeInTheDocument();
    });

    it('shows username exists error when API returns 409', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        vi.mocked(api.post).mockRejectedValueOnce({
            response: { status: 409 },
        });

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(
            await screen.findByText(
                'Username already exists, please choose a different one.'
            )
        ).toBeInTheDocument();
    });

    it('shows backend message when API returns another error', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        vi.mocked(api.post).mockRejectedValueOnce({
            response: {
                status: 400,
                data: { message: 'Email already in use.' },
            },
        });

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(await screen.findByText('Email already in use.')).toBeInTheDocument();
    });

    it('shows fallback error when API error has no message', async () => {
        const { unmount: cleanup } = renderComponent();
        unmount = cleanup;
        const user = userEvent.setup();

        vi.mocked(api.post).mockRejectedValueOnce(new Error('Network Error'));

        await user.type(screen.getByLabelText(/username:/i), 'alice');
        await user.type(screen.getByLabelText(/email:/i), 'alice@email.com');
        await user.type(screen.getAllByLabelText(/password:/i)[0], 'Password1@');
        await user.type(screen.getAllByLabelText(/password:/i)[1], 'Password1@');
        await user.click(screen.getByRole('button', { name: /register/i }));

        expect(await screen.findByText('Registration failed.')).toBeInTheDocument();
    });
});