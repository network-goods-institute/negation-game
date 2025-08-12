"use client";

import RationaleMetaForm, { RationaleMetaFormProps } from "./RationaleMetaForm";
import EnhancedRationalePointsList, { EnhancedRationalePointsListProps } from "./EnhancedRationalePointsList";

export interface NewRationaleFormProps {
    title: string;
    onTitleChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    topic: string;
    onTopicChange: (value: string) => void;
    topics: RationaleMetaFormProps["topics"];
    currentSpace: string;
    points: EnhancedRationalePointsListProps["points"];
    hoveredPointId?: EnhancedRationalePointsListProps["hoveredPointId"];
    isDescriptionEditing?: boolean;
    onDescriptionEdit?: () => void;
    onDescriptionBlur?: () => void;
    isCopiedRationale?: boolean;
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
    isCopiedRationale = false,
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
                allowTopicEditInHeader={!isCopiedRationale}
                hideTitle
                showTopicHeader
                hideTopicSelector
                showTopicLockedHint={isCopiedRationale}
                spaceSlug={currentSpace}
                enableTopicNavigation
                isDescriptionEditing={isDescriptionEditing}
                onDescriptionEdit={onDescriptionEdit}
                onDescriptionBlur={onDescriptionBlur}
            />
            {points.length > 0 && (
                <EnhancedRationalePointsList points={points} hoveredPointId={hoveredPointId} />
            )}
        </div>
    );
} 