"use client";

import RationaleMetaForm, { RationaleMetaFormProps } from "@/components/RationaleMetaForm";
import RationalePointsList, { RationalePointsListProps } from "@/components/RationalePointsList";

export interface NewRationaleFormProps {
    title: string;
    onTitleChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    topic: string;
    onTopicChange: (value: string) => void;
    topics: RationaleMetaFormProps["topics"];
    currentSpace: string;
    points: RationalePointsListProps["points"];
    hoveredPointId?: RationalePointsListProps["hoveredPointId"];
    isDescriptionEditing?: boolean;
    onDescriptionEdit?: () => void;
    onDescriptionBlur?: () => void;
}

export default function NewRationaleForm({
    title,
    onTitleChange,
    description,
    onDescriptionChange,
    topic,
    onTopicChange,
    topics,
    currentSpace,
    points,
    hoveredPointId,
    isDescriptionEditing,
    onDescriptionEdit,
    onDescriptionBlur,
}: NewRationaleFormProps) {
    return (
        <div className="overflow-auto">
            <RationaleMetaForm
                title={title}
                onTitleChange={onTitleChange}
                description={description}
                onDescriptionChange={onDescriptionChange}
                topic={topic}
                onTopicChange={onTopicChange}
                topics={topics}
                currentSpace={currentSpace}
                isNew
                canEdit
                isDescriptionEditing={isDescriptionEditing}
                onDescriptionEdit={onDescriptionEdit}
                onDescriptionBlur={onDescriptionBlur}
            />
            {points.length > 0 && (
                <RationalePointsList points={points} hoveredPointId={hoveredPointId} />
            )}
        </div>
    );
} 