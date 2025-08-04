'use client';

import EditableText from './editable-text';

interface EditableTextareaProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  className?: string
  placeholder?: string
  disabled?: boolean
}

export default function EditableTextarea(props: EditableTextareaProps) {
  return <EditableText {...props} multiline />;
}