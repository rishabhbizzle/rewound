"use client";
import { useCallback, useState } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortablePhotoGridProps {
  photoUrls: string[];
  onReorder: (newUrls: string[], newIndices: number[]) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  processingPhotos: boolean;
  maxPhotos: number;
}

function SortablePhoto({
  url,
  id,
  index,
  onRemove,
}: {
  url: string;
  id: string;
  index: number;
  onRemove: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-[3/4] rounded-xl overflow-hidden group"
    >
      {/* Drag handle — the entire image */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Image
          src={url}
          alt={`Photo ${index + 1}`}
          fill
          className="object-cover pointer-events-none"
          unoptimized
          draggable={false}
        />
      </div>

      {/* Order badge */}
      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/60 text-white/60 flex items-center justify-center text-[9px] font-mono">
        {index + 1}
      </div>

      {/* Remove button — always visible on mobile (active), hover on desktop */}
      <button
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white/70 flex items-center justify-center text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
      >
        ✕
      </button>

      {/* Drag hint on first photo */}
      {index === 0 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[7px] text-white/30 bg-black/40 px-1.5 py-0.5 rounded font-mono">
            hold to drag
          </span>
        </div>
      )}
    </div>
  );
}

export default function SortablePhotoGrid({
  photoUrls,
  onReorder,
  onRemove,
  onAdd,
  processingPhotos,
  maxPhotos,
}: SortablePhotoGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Require a 5px drag distance before starting — prevents accidental drags on tap
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Stable IDs for each photo slot
  const ids = photoUrls.map((_, i) => `photo-${i}`);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);

      const newUrls = arrayMove(photoUrls, oldIndex, newIndex);
      // Build index mapping so parent can reorder photoFiles too
      const newIndices = arrayMove(
        photoUrls.map((_, i) => i),
        oldIndex,
        newIndex
      );

      onReorder(newUrls, newIndices);
    },
    [ids, photoUrls, onReorder]
  );

  const activeIndex = activeId ? ids.indexOf(activeId) : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-2 w-full">
          {photoUrls.map((url, i) => (
            <SortablePhoto
              key={ids[i]}
              id={ids[i]}
              url={url}
              index={i}
              onRemove={onRemove}
            />
          ))}

          {photoUrls.length < maxPhotos && !processingPhotos && (
            <button
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 active:border-white/25 flex flex-col items-center justify-center gap-1.5 text-white/20 hover:text-white/40 transition-all"
              onClick={onAdd}
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-[10px]">Add</span>
            </button>
          )}

          {processingPhotos && (
            <div className="aspect-[3/4] rounded-xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-amber-500/50 animate-spin" />
              <span className="text-[9px] text-white/20 font-mono">
                optimizing
              </span>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Drag overlay — the floating preview while dragging */}
      <DragOverlay>
        {activeId && activeIndex >= 0 ? (
          <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-black/60 ring-2 ring-amber-500/30 w-[calc(33.33%-6px)]">
            <div className="relative w-full h-full">
              <Image
                src={photoUrls[activeIndex]}
                alt="Dragging"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
