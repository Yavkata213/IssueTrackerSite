import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { isSafeLinkUrl } from '../../utils/richText';

/**
 * An image of the text is always an attachment of the issue. It is parsed only from our own
 * markup (`data-attachment-id`), so an `<img>` pasted from a web page never becomes a picture
 * that loads from somewhere else.
 */
const AttachmentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      attachmentId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-attachment-id'),
        renderHTML: (attributes: Record<string, unknown>) =>
          typeof attributes.attachmentId === 'string' ? { 'data-attachment-id': attributes.attachmentId } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: 'img[data-attachment-id]' }];
  },
});

export function createExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        isAllowedUri: (url: string) => isSafeLinkUrl(url),
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      },
    }),
    AttachmentImage.configure({ allowBase64: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder }),
  ];
}
