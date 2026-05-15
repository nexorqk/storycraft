import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChildrenManager } from '../app/components/children-manager';
import * as childrenApi from '../lib/children-api';

vi.mock('../lib/children-api', () => ({
  listChildren: vi.fn(),
  createChild: vi.fn(),
  updateChild: vi.fn(),
  deleteChild: vi.fn(),
}));

const mockListChildren = vi.mocked(childrenApi.listChildren);
const mockCreateChild = vi.mocked(childrenApi.createChild);
const mockUpdateChild = vi.mocked(childrenApi.updateChild);
const mockDeleteChild = vi.mocked(childrenApi.deleteChild);

const sampleChildren = [
  {
    id: 'c1',
    name: 'Masha',
    birthDate: '2020-03-15',
    interests: ['space', 'animals'],
    readingLevel: 'beginner',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    name: 'Dmitry',
    birthDate: null,
    interests: [],
    readingLevel: null,
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-02-01T00:00:00Z',
  },
];

describe('ChildrenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockListChildren.mockReturnValue(new Promise(() => {}));
    render(<ChildrenManager />);
    expect(screen.getByText('Loading profiles')).toBeInTheDocument();
  });

  it('shows empty state when no children exist', async () => {
    mockListChildren.mockResolvedValue({ children: [] });
    render(<ChildrenManager />);
    await screen.findByText('No child profiles yet.');
    expect(screen.getByText('0 children')).toBeInTheDocument();
  });

  it('renders a list of child profiles sorted by name', async () => {
    mockListChildren.mockResolvedValue({ children: sampleChildren });
    render(<ChildrenManager />);
    await screen.findByText('2 children');
    expect(screen.getByText('Masha')).toBeInTheDocument();
    expect(screen.getByText('Dmitry')).toBeInTheDocument();
    const names = screen.getAllByRole('heading', { level: 3 });
    expect(names.map((el) => el.textContent)).toEqual(['Dmitry', 'Masha']);
  });

  it('shows error state when loading fails', async () => {
    mockListChildren.mockRejectedValue(new Error('Unauthorized'));
    render(<ChildrenManager />);
    await screen.findByText('Sign in to manage child profiles.');
  });

  it('creates a child profile via form submission', async () => {
    const user = userEvent.setup();
    mockListChildren.mockResolvedValue({ children: [] });
    mockCreateChild.mockResolvedValue({
      child: {
        id: 'c3',
        name: 'Ivan',
        birthDate: '2021-06-01',
        interests: ['music'],
        readingLevel: null,
        createdAt: '2025-06-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
      },
    });

    render(<ChildrenManager />);
    await screen.findByText('No child profiles yet.');

    await user.type(screen.getByLabelText('Name'), 'Ivan');
    await user.type(screen.getByLabelText('Birth date'), '2021-06-01');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(mockCreateChild).toHaveBeenCalledWith({
      name: 'Ivan',
      birthDate: '2021-06-01',
      interests: [],
      readingLevel: undefined,
    });

    await screen.findByText('Ivan');
  });

  it('displays form error when createChild fails', async () => {
    const user = userEvent.setup();
    mockListChildren.mockResolvedValue({ children: [] });
    mockCreateChild.mockRejectedValue(new Error('Name is required'));

    render(<ChildrenManager />);
    await screen.findByText('No child profiles yet.');

    await user.type(screen.getByLabelText('Name'), 'Test');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await screen.findByText('Name is required');
  });

  it('enters edit mode and calls updateChild', async () => {
    const user = userEvent.setup();
    mockListChildren.mockResolvedValue({ children: sampleChildren });
    mockUpdateChild.mockResolvedValue({
      child: {
        id: 'c1',
        name: 'Masha Updated',
        birthDate: '2020-03-15',
        interests: ['space', 'animals'],
        readingLevel: 'beginner',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
      },
    });

    render(<ChildrenManager />);
    await screen.findByText('2 children');

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]!);

    expect(screen.getByText('Edit profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Masha Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mockUpdateChild).toHaveBeenCalled();
  });

  it('deletes a child profile', async () => {
    const user = userEvent.setup();
    mockListChildren.mockResolvedValue({ children: sampleChildren });
    mockDeleteChild.mockResolvedValue({ ok: true });

    window.confirm = vi.fn(() => true);

    render(<ChildrenManager />);
    await screen.findByText('2 children');

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]!);

    expect(mockDeleteChild).toHaveBeenCalled();
  });
});