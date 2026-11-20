import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useId, useMemo, useRef, useState } from 'react';
import type { RichTextDoc } from '../../types';
import { IMAGE_TYPES } from '../../utils/attachments';
import { EMPTY_DOC, isSafeLinkUrl, withImageUrls, withoutImageUrls } from '../../utils/richText';
import { createExtensions } from './editorExtensions';
import { EditorToolbar } from './EditorToolbar';

export interface UploadedImage {
  attachmentId: string;
  /** Where the picture is shown from. */
  url: string;
}

interface RichTextEditorProps {
  /** The stored document. It is read once; give the editor another `key` to load another one. */
  initialDoc: RichTextDoc | null;
  /** Attachment id -> URL of the picture, for the images of the stored document. */
  imageUrls: ReadonlyMap<string, string>;
  editable: boolean;
  placeholder: string;
  /** `page`: 16 px text with wide margins; `panel`: 14 px text in the narrower side panel. */
  size: 'page' | 'panel';
  /** Called on every change, with the document as it is to be stored (images by attachment id). */
  onChange: (doc: RichTextDoc) => void;
  /** Uploads a picture as an attachment of the issue. */
  onUploadImage: (file: File) => Promise<UploadedImage>;
  onAttachFiles: () => void;
  /** Something went wrong (a refused file): shown by the page. */
  onError: (message: string) => void;
  /** Shown between the toolbar and the text: the file cards. */
  aboveText?: ReactNode;
}

function contentSx(size: 'page' | 'panel') {
  const page = size === 'page';
  return {
    px: page ? 4 : '15px',
    '& .tiptap': {
      outline: 'none',
      minHeight: page ? 120 : 80,
      fontSize: page ? 16 : 14,
      lineHeight: page ? '24px' : '22px',
      overflowWrap: 'anywhere',
    },
    '& .tiptap > * + *': { mt: page ? '10px' : '8px' },
    '& .tiptap h1': { fontSize: page ? 28 : 22, lineHeight: 1.25, fontWeight: 400, m: 0 },
    '& .tiptap h2': { fontSize: page ? 24 : 18, lineHeight: 1.3, fontWeight: 400, m: 0 },
    '& .tiptap h3': { fontSize: page ? 20 : 16, lineHeight: 1.3, fontWeight: 500, m: 0 },
    '& .tiptap p': { m: 0 },
    '& .tiptap ul, & .tiptap ol': { m: 0, pl: page ? '26px' : '22px' },
    '& .tiptap ul[data-type="taskList"]': { listStyle: 'none', pl: 0 },
    '& .tiptap ul[data-type="taskList"] li': { display: 'flex', alignItems: 'flex-start', gap: 1 },
    '& .tiptap ul[data-type="taskList"] li > label': { flexShrink: 0, mt: '2px' },
    '& .tiptap ul[data-type="taskList"] li > div': { flex: 1 },
    '& .tiptap blockquote': { m: 0, pl: 2, borderLeft: 3, borderLeftStyle: 'solid', borderLeftColor: 'divider', color: 'text.secondary' },
    '& .tiptap code': { fontFamily: 'monospace', fontSize: '0.9em', px: '4px', borderRadius: '4px', bgcolor: 'action.hover' },
    '& .tiptap pre': { m: 0, p: 1.5, borderRadius: 1, bgcolor: 'action.hover', overflowX: 'auto' },
    '& .tiptap pre code': { p: 0, bgcolor: 'transparent' },
    '& .tiptap a': { color: 'primary.main', cursor: 'pointer' },
    '& .tiptap img': { display: 'block', maxWidth: page ? 388 : 360, width: '100%', height: 'auto', borderRadius: 0.5 },
    '& .tiptap img.ProseMirror-selectednode': { outline: '2px solid', outlineColor: 'primary.main' },
    '& .tiptap table': { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' },
    '& .tiptap th, & .tiptap td': { border: 1, borderStyle: 'solid', borderColor: 'divider', p: '6px 8px', verticalAlign: 'top', textAlign: 'left' },
    '& .tiptap th': { bgcolor: 'action.hover', fontWeight: 500 },
    '& .tiptap p.is-editor-empty:first-of-type::before': {
      content: 'attr(data-placeholder)',
      float: 'left',
      height: 0,
      pointerEvents: 'none',
      color: 'text.disabled',
    },
  } as const;
}

/**
 * The description editor: toolbar, file cards slot and the text. All content goes through the
 * editor schema (known nodes only, safe links, pictures only from attachments), never as HTML.
 */
export function RichTextEditor({
  initialDoc,
  imageUrls,
  editable,
  placeholder,
  size,
  onChange,
  onUploadImage,
  onAttachFiles,
  onError,
  aboveText,
}: RichTextEditorProps) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [linkEditor, setLinkEditor] = useState<{ href: string } | null>(null);
  const extensions = useMemo(() => createExtensions(placeholder), [placeholder]);
  const startContent = useMemo(() => withImageUrls(initialDoc ?? EMPTY_DOC, imageUrls), [initialDoc, imageUrls]);

  // Pictures can come from the toolbar, a paste or a drop: all of them are uploaded first.
  const insertImages = (editor: Editor, files: File[]) => {
    for (const file of files) {
      onUploadImage(file)
        .then((image) => {
          editor
            .chain()
            .focus()
            .insertContent({ type: 'image', attrs: { src: image.url, attachmentId: image.attachmentId, alt: file.name } })
            .run();
        })
        .catch((error: unknown) => onError(error instanceof Error ? error.message : 'The picture could not be uploaded.'));
    }
  };
  const editorRef = useRef<Editor | null>(null);
  const pickImages = (files: File[]) => files.filter((f) => (IMAGE_TYPES as readonly string[]).includes(f.type));

  // The editor takes the options of every render, so these handlers always see the latest props.
  const editor = useEditor({
    extensions,
    content: startContent,
    editable,
    onCreate: ({ editor: created }) => {
      editorRef.current = created;
    },
    onUpdate: ({ editor: current }) => {
      const json = current.getJSON();
      onChange(withoutImageUrls(json.type === 'doc' ? (json as RichTextDoc) : EMPTY_DOC));
    },
    editorProps: {
      attributes: { 'aria-label': 'Issue description', role: 'textbox', 'aria-multiline': 'true' },
      handlePaste: (_view, event) => {
        const files = pickImages([...(event.clipboardData?.files ?? [])]);
        if (files.length === 0 || !editorRef.current) return false;
        insertImages(editorRef.current, files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = pickImages([...(event.dataTransfer?.files ?? [])]);
        if (files.length === 0 || !editorRef.current) return false;
        insertImages(editorRef.current, files);
        return true;
      },
    },
  });

  const linkFieldId = useId();
  if (!editor) return null;

  const openLinkEditor = () => setLinkEditor({ href: (editor.getAttributes('link').href as string | undefined) ?? '' });
  const applyLink = () => {
    const href = linkEditor?.href.trim() ?? '';
    if (href === '') editor.chain().focus().unsetLink().run();
    else if (isSafeLinkUrl(href)) editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    else return;
    setLinkEditor(null);
  };
  const linkInvalid = linkEditor !== null && linkEditor.href.trim() !== '' && !isSafeLinkUrl(linkEditor.href.trim());

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {editable && (
        <EditorToolbar
          editor={editor}
          onPickImage={() => imageInput.current?.click()}
          onAttachFiles={onAttachFiles}
          onEditLink={openLinkEditor}
          compact={size === 'panel'}
        />
      )}
      {aboveText}
      <Box sx={{ pt: aboveText ? 3 : 2, pb: 2, ...contentSx(size) }}>
        <EditorContent editor={editor} />
      </Box>

      <input
        ref={imageInput}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        multiple
        hidden
        aria-label="Image file"
        onChange={(event) => {
          insertImages(editor, [...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
      <Dialog open={linkEditor !== null} onClose={() => setLinkEditor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Link</DialogTitle>
        <DialogContent>
          <TextField
            id={linkFieldId}
            autoFocus
            fullWidth
            margin="dense"
            label="Address"
            placeholder="https://"
            value={linkEditor?.href ?? ''}
            error={linkInvalid}
            helperText={linkInvalid ? 'Use an address that starts with https://, http:// or mailto:' : 'Leave empty to remove the link.'}
            onChange={(event) => setLinkEditor({ href: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyLink();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLinkEditor(null)}>Cancel</Button>
          <Button variant="contained" onClick={applyLink} disabled={linkInvalid}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
