import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EditableNonCompliance } from '../../types/reportEditor';
import { NonComplianceItem } from './NonComplianceItem';

interface SortableItemProps {
    id: string;
    nc: EditableNonCompliance;
    index: number;
    updateNonCompliance: (id: string, updates: Partial<EditableNonCompliance>) => void;
    moveNonCompliance: (id: string, direction: 'up' | 'down') => void;
    renderText?: boolean;
    photoSlice?: [number, number];
}

export const SortableItem: React.FC<SortableItemProps> = ({
    id,
    nc,
    index,
    updateNonCompliance,
    moveNonCompliance,
    renderText,
    photoSlice
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 100 : 1
    };

    return (
        <NonComplianceItem
            nc={nc}
            index={index}
            updateNonCompliance={updateNonCompliance}
            moveNonCompliance={moveNonCompliance}
            innerRef={setNodeRef}
            style={style}
            dragHandleProps={attributes}
            dragListeners={listeners}
            renderText={renderText}
            photoSlice={photoSlice}
        />
    );
};
