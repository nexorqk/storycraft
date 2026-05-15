'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createChild,
  deleteChild,
  listChildren,
  updateChild,
  type ChildPayload,
  type ChildProfile,
} from '../../lib/children-api';

type LoadStatus = 'loading' | 'ready' | 'error';

type FormState = {
  name: string;
  birthDate: string;
  interests: string;
  readingLevel: string;
};

const emptyForm: FormState = {
  name: '',
  birthDate: '',
  interests: '',
  readingLevel: '',
};

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function toFormState(child: ChildProfile): FormState {
  return {
    name: child.name,
    birthDate: toDateInputValue(child.birthDate),
    interests: child.interests.join(', '),
    readingLevel: child.readingLevel ?? '',
  };
}

function toPayload(form: FormState): ChildPayload {
  return {
    name: form.name.trim(),
    birthDate: form.birthDate || undefined,
    interests: form.interests
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    readingLevel: form.readingLevel.trim() || undefined,
  };
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return 'No birth date';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function ChildrenManager() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sortedChildren = useMemo(
    () =>
      [...children].sort((first, second) =>
        first.name.localeCompare(second.name, 'ru'),
      ),
    [children],
  );

  async function loadChildren() {
    setStatus('loading');
    setError(null);

    try {
      const result = await listChildren();
      setChildren(result.children);
      setStatus('ready');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load child profiles',
      );
      setStatus('error');
    }
  }

  useEffect(() => {
    void loadChildren();
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingChildId(null);
  }

  function startEdit(child: ChildProfile) {
    setForm(toFormState(child));
    setEditingChildId(child.id);
    setError(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = toPayload(form);
      const result = editingChildId
        ? await updateChild(editingChildId, payload)
        : await createChild(payload);

      setChildren((current) => {
        if (!editingChildId) {
          return [result.child, ...current];
        }

        return current.map((child) =>
          child.id === result.child.id ? result.child : child,
        );
      });
      resetForm();
      setStatus('ready');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save child profile',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeChild(childId: string) {
    setError(null);

    try {
      await deleteChild(childId);
      setChildren((current) => current.filter((child) => child.id !== childId));

      if (editingChildId === childId) {
        resetForm();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete child profile',
      );
    }
  }

  return (
    <div className="children-layout">
      <section className="form-panel">
        <div className="section-heading">
          <p className="eyebrow">Child profile</p>
          <h2>{editingChildId ? 'Edit profile' : 'Create profile'}</h2>
        </div>

        <form className="child-form" onSubmit={submitForm}>
          <label className="field">
            <span>Name</span>
            <input
              maxLength={80}
              onChange={(event) => updateForm('name', event.target.value)}
              required
              type="text"
              value={form.name}
            />
          </label>

          <label className="field">
            <span>Birth date</span>
            <input
              onChange={(event) => updateForm('birthDate', event.target.value)}
              type="date"
              value={form.birthDate}
            />
          </label>

          <label className="field">
            <span>Reading level</span>
            <input
              maxLength={80}
              onChange={(event) =>
                updateForm('readingLevel', event.target.value)
              }
              placeholder="Beginner, confident reader"
              type="text"
              value={form.readingLevel}
            />
          </label>

          <label className="field">
            <span>Interests</span>
            <textarea
              maxLength={900}
              onChange={(event) => updateForm('interests', event.target.value)}
              placeholder="Space, animals, music"
              rows={4}
              value={form.interests}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            {editingChildId ? (
              <button
                className="secondary-button"
                onClick={resetForm}
                type="button"
              >
                Cancel
              </button>
            ) : null}
            <button
              className="primary-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Saving' : editingChildId ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </section>

      <section className="list-panel">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">Profiles</p>
            <h2>{children.length} children</h2>
          </div>
          <button className="secondary-button" onClick={loadChildren}>
            Refresh
          </button>
        </div>

        {status === 'loading' ? (
          <div className="empty-state">Loading profiles</div>
        ) : null}

        {status === 'error' ? (
          <div className="empty-state">Sign in to manage child profiles.</div>
        ) : null}

        {status === 'ready' && sortedChildren.length === 0 ? (
          <div className="empty-state">No child profiles yet.</div>
        ) : null}

        {status === 'ready' && sortedChildren.length > 0 ? (
          <div className="child-list">
            {sortedChildren.map((child) => (
              <article className="child-card" key={child.id}>
                <div>
                  <h3>{child.name}</h3>
                  <p>{formatBirthDate(child.birthDate)}</p>
                  <p>{child.readingLevel || 'No reading level'}</p>
                </div>

                {child.interests.length > 0 ? (
                  <div className="tag-list">
                    {child.interests.map((interest) => (
                      <span className="tag" key={interest}>
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="card-actions">
                  <button
                    className="secondary-button"
                    onClick={() => startEdit(child)}
                  >
                    Edit
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => removeChild(child.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
