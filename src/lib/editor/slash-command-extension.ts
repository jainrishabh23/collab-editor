import { Editor, Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import tippy, { Instance as TippyInstance } from "tippy.js";
import SlashCommandList, {
  type SlashCommandListRef,
} from "@/components/slash-command-list";

export type SlashCommandItem = {
  title: string;
  description: string;
  searchTerms: string[];
  icon: React.ReactNode;
  command: ({ editor, range }: { editor: Editor; range: { from: number; to: number } }) => void;
};

export type SlashCommandsOptions = {
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, "editor">;
};

export const SlashCommandsExtension = Extension.create<SlashCommandsOptions>({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

/**
 * Builds the suggestion config that wires the slash menu UI to Tiptap.
 * Pass into the extension via `.configure({ suggestion: makeSuggestionConfig(items) })`.
 */
export function makeSuggestionConfig(items: SlashCommandItem[]) {
  return {
    items: ({ query }: { query: string }) => {
      const q = query.toLowerCase();
      return items
        .filter((item) => {
          if (!q) return true;
          if (item.title.toLowerCase().includes(q)) return true;
          return item.searchTerms.some((term) => term.toLowerCase().includes(q));
        })
        .slice(0, 10);
    },
    render: () => {
      let component: ReactRenderer<SlashCommandListRef> | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: {
          editor: Editor;
          clientRect?: (() => DOMRect | null) | null;
          items: SlashCommandItem[];
          command: (item: SlashCommandItem) => void;
        }) => {
          component = new ReactRenderer(SlashCommandList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: () =>
              props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            theme: "light-border",
            offset: [0, 6],
          });
        },

        onUpdate(props: {
          editor: Editor;
          clientRect?: (() => DOMRect | null) | null;
          items: SlashCommandItem[];
          command: (item: SlashCommandItem) => void;
        }) {
          component?.updateProps(props);

          if (!props.clientRect) return;
          popup?.[0]?.setProps({
            getReferenceClientRect: () =>
              props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
          });
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}