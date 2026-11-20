import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CodeIcon from '@mui/icons-material/Code';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import ImageIcon from '@mui/icons-material/Image';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import RedoIcon from '@mui/icons-material/Redo';
import TableChartIcon from '@mui/icons-material/TableChart';
import UndoIcon from '@mui/icons-material/Undo';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

type BlockStyle = 'paragraph' | 'h1' | 'h2' | 'h3';

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          // Keeps the selection in the text while a button is pressed.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
          sx={{ borderRadius: 1, color: active ? 'primary.main' : 'action.active', bgcolor: active ? 'action.selected' : undefined }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function Separator() {
  return <Divider orientation="vertical" flexItem sx={{ mx: 1, my: '14px' }} />;
}

interface EditorToolbarProps {
  editor: Editor;
  onPickImage: () => void;
  onAttachFiles: () => void;
  /** Opens the link dialog. */
  onEditLink: () => void;
  /** The narrow side panel has no room for the "Attach files" button; the paper clip stays. */
  compact: boolean;
}

/** Formatting buttons above the text, and "Attach files" at the right. */
export function EditorToolbar({ editor, onPickImage, onAttachFiles, onEditLink, compact }: EditorToolbarProps) {
  const [tableAnchor, setTableAnchor] = useState<HTMLElement | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      block: (current.isActive('heading', { level: 1 })
        ? 'h1'
        : current.isActive('heading', { level: 2 })
          ? 'h2'
          : current.isActive('heading', { level: 3 })
            ? 'h3'
            : 'paragraph') as BlockStyle,
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      link: current.isActive('link'),
      bullet: current.isActive('bulletList'),
      ordered: current.isActive('orderedList'),
      tasks: current.isActive('taskList'),
      quote: current.isActive('blockquote'),
      code: current.isActive('codeBlock'),
      inTable: current.isActive('table'),
    }),
  });

  const chain = () => editor.chain().focus();
  const setBlock = (style: BlockStyle) => {
    if (style === 'paragraph') chain().setParagraph().run();
    else chain().setHeading({ level: Number(style.slice(1)) as 1 | 2 | 3 }).run();
  };
  const closeTable = () => setTableAnchor(null);

  return (
    <Box
      role="toolbar"
      aria-label="Text formatting"
      sx={{ height: 50, px: compact ? '12px' : 3, display: 'flex', alignItems: 'center', gap: '2px', borderBottom: 1, borderColor: 'divider' }}
    >
      <ToolbarButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <UndoIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <RedoIcon fontSize="small" />
      </ToolbarButton>
      <Separator />
      <Select
        variant="standard"
        disableUnderline
        value={state.block}
        onChange={(event) => setBlock(event.target.value)}
        inputProps={{ 'aria-label': 'Text style' }}
        sx={{ width: 112, fontSize: 14, '& .MuiSelect-select': { pl: 1 } }}
      >
        <MenuItem value="paragraph">Paragraph</MenuItem>
        <MenuItem value="h1">Heading 1</MenuItem>
        <MenuItem value="h2">Heading 2</MenuItem>
        <MenuItem value="h3">Heading 3</MenuItem>
      </Select>
      <Separator />
      <ToolbarButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <FormatBoldIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <FormatItalicIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <FormatUnderlinedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={state.link} onClick={onEditLink}>
        <InsertLinkIcon fontSize="small" />
      </ToolbarButton>
      <Separator />
      <ToolbarButton label="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
        <FormatListBulletedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <FormatListNumberedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Checklist" active={state.tasks} onClick={() => chain().toggleTaskList().run()}>
        <ChecklistIcon fontSize="small" />
      </ToolbarButton>
      <Separator />
      <ToolbarButton label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <FormatQuoteIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Code block" active={state.code} onClick={() => chain().toggleCodeBlock().run()}>
        <CodeIcon fontSize="small" />
      </ToolbarButton>
      <Separator />
      <ToolbarButton label="Insert image" onClick={onPickImage}>
        <ImageIcon fontSize="small" />
      </ToolbarButton>
      <Tooltip title="Table">
        <IconButton
          size="small"
          aria-label="Table"
          aria-haspopup="menu"
          aria-pressed={state.inTable}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            if (state.inTable) setTableAnchor(event.currentTarget);
            else chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          }}
          sx={{ borderRadius: 1, color: state.inTable ? 'primary.main' : 'action.active', bgcolor: state.inTable ? 'action.selected' : undefined }}
        >
          <TableChartIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <ToolbarButton label="Attach files" onClick={onAttachFiles}>
        <AttachFileIcon fontSize="small" />
      </ToolbarButton>
      <Box sx={{ flex: 1 }} />
      {!compact && (
      <Button
        variant="outlined"
        color="primary"
        startIcon={<AttachFileIcon sx={{ transform: 'rotate(45deg)' }} />}
        onClick={onAttachFiles}
        sx={{ height: 26, px: 1.5, color: 'primary.main', borderColor: 'primary.main', fontWeight: 400, borderRadius: '2px' }}
      >
        Attach files
      </Button>
      )}

      <Menu anchorEl={tableAnchor} open={tableAnchor !== null} onClose={closeTable}>
        {[
          ['Add row below', () => chain().addRowAfter().run()],
          ['Add column to the right', () => chain().addColumnAfter().run()],
          ['Delete row', () => chain().deleteRow().run()],
          ['Delete column', () => chain().deleteColumn().run()],
          ['Delete table', () => chain().deleteTable().run()],
        ].map(([label, run]) => (
          <MenuItem
            key={label as string}
            onClick={() => {
              (run as () => void)();
              closeTable();
            }}
          >
            {label as string}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
