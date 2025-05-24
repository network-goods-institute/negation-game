"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface MetaEditState {
  title: string;
  description: string;
  topic: string;
  isTitleEditing: boolean;
  isDescriptionEditing: boolean;
  isTopicEditing: boolean;
  isModified: boolean;
  handleTitleEdit: () => void;
  handleDescriptionEdit: () => void;
  handleTopicEdit: () => void;
  handleEditingBlur: () => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setTopic: (value: string) => void;
  resetMeta: () => void;
}

/**
 * Hook to manage editing state of title/description/topic fields.
 */
export function useMetaEdit(initial: {
  title: string;
  description: string;
  topic?: string;
}): MetaEditState {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [topic, setTopic] = useState(initial.topic || "");

  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [isTopicEditing, setIsTopicEditing] = useState(false);

  const originalTitle = useRef(initial.title);
  const originalDescription = useRef(initial.description);
  const originalTopic = useRef(initial.topic || "");

  useEffect(() => {
    setTitle(initial.title);
    setDescription(initial.description);
    setTopic(initial.topic || "");
    originalTitle.current = initial.title;
    originalDescription.current = initial.description;
    originalTopic.current = initial.topic || "";
  }, [initial]);

  const handleTitleEdit = useCallback(() => setIsTitleEditing(true), []);
  const handleDescriptionEdit = useCallback(
    () => setIsDescriptionEditing(true),
    []
  );
  const handleTopicEdit = useCallback(() => setIsTopicEditing(true), []);

  const handleEditingBlur = useCallback(() => {
    setIsTitleEditing(false);
    setIsDescriptionEditing(false);
    setIsTopicEditing(false);
  }, []);

  const isModified =
    title !== originalTitle.current ||
    description !== originalDescription.current ||
    topic !== originalTopic.current;

  const resetMeta = useCallback(() => {
    setTitle(originalTitle.current);
    setDescription(originalDescription.current);
    setTopic(originalTopic.current);
  }, []);

  return {
    title,
    description,
    topic,
    isTitleEditing,
    isDescriptionEditing,
    isTopicEditing,
    isModified,
    handleTitleEdit,
    handleDescriptionEdit,
    handleTopicEdit,
    handleEditingBlur,
    setTitle,
    setDescription,
    setTopic,
    resetMeta,
  };
}
