'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var slate = require('slate');
var debounce = _interopDefault(require('debounce'));
var getDirection = _interopDefault(require('direction'));
var isHotkey = require('is-hotkey');
var ReactDOM = _interopDefault(require('react-dom'));

/**
 * Leaf content strings.
 */
const String = (props) => {
    const { isLast, leaf, parent, text } = props;
    const editor = useEditor();
    const path = ReactEditor.findPath(editor, text);
    const parentPath = slate.Path.parent(path);
    // COMPAT: Render text inside void nodes with a zero-width space.
    // So the node can contain selection but the text is not visible.
    if (editor.isVoid(parent)) {
        return React__default.createElement(ZeroWidthString, { length: slate.Node.string(parent).length });
    }
    // COMPAT: If this is the last text node in an empty block, render a zero-
    // width space that will convert into a line break when copying and pasting
    // to support expected plain text.
    if (leaf.text === '' &&
        parent.children[parent.children.length - 1] === text &&
        !editor.isInline(parent) &&
        slate.Editor.string(editor, parentPath) === '') {
        return React__default.createElement(ZeroWidthString, { isLineBreak: true });
    }
    // COMPAT: If the text is empty, it's because it's on the edge of an inline
    // node, so we render a zero-width space so that the selection can be
    // inserted next to it still.
    if (leaf.text === '') {
        return React__default.createElement(ZeroWidthString, null);
    }
    // COMPAT: Browsers will collapse trailing new lines at the end of blocks,
    // so we need to add an extra trailing new lines to prevent that.
    if (isLast && leaf.text.slice(-1) === '\n') {
        return React__default.createElement(TextString, { isTrailing: true, text: leaf.text });
    }
    return React__default.createElement(TextString, { text: leaf.text });
};
/**
 * Leaf strings with text in them.
 */
const TextString = (props) => {
    const { text, isTrailing = false } = props;
    return (React__default.createElement("span", { "data-slate-string": true },
        text,
        isTrailing ? '\n' : null));
};
/**
 * Leaf strings without text, render as zero-width strings.
 */
const ZeroWidthString = (props) => {
    const { length = 0, isLineBreak = false } = props;
    return (React__default.createElement("span", { "data-slate-zero-width": isLineBreak ? 'n' : 'z', "data-slate-length": length },
        '\uFEFF',
        isLineBreak ? React__default.createElement("br", null) : null));
};

/**
 * Two weak maps that allow us rebuild a path given a node. They are populated
 * at render time such that after a render occurs we can always backtrack.
 */
var NODE_TO_INDEX = new WeakMap();
var NODE_TO_PARENT = new WeakMap();
/**
 * Weak maps that allow us to go between Slate nodes and DOM nodes. These
 * are used to resolve DOM event-related logic into Slate actions.
 */

var EDITOR_TO_ELEMENT = new WeakMap();
var ELEMENT_TO_NODE = new WeakMap();
var KEY_TO_ELEMENT = new WeakMap();
var NODE_TO_ELEMENT = new WeakMap();
var NODE_TO_KEY = new WeakMap();
/**
 * Weak maps for storing editor-related state.
 */

var IS_READ_ONLY = new WeakMap();
var IS_FOCUSED = new WeakMap();
/**
 * Weak map for associating the context `onChange` context with the plugin.
 */

var EDITOR_TO_ON_CHANGE = new WeakMap();
/**
 * Symbols.
 */

var PLACEHOLDER_SYMBOL = Symbol('placeholder');

/**
 * Individual leaves in a text node with unique formatting.
 */
const Leaf = (props) => {
    const { leaf, isLast, text, parent, renderLeaf = (props) => React__default.createElement(DefaultLeaf, Object.assign({}, props)), } = props;
    let children = (React__default.createElement(String, { isLast: isLast, leaf: leaf, parent: parent, text: text }));
    if (leaf[PLACEHOLDER_SYMBOL]) {
        children = (React__default.createElement(React__default.Fragment, null,
            React__default.createElement("span", { contentEditable: false, style: {
                    pointerEvents: 'none',
                    display: 'inline-block',
                    verticalAlign: 'text-top',
                    width: '0',
                    maxWidth: '100%',
                    whiteSpace: 'nowrap',
                    opacity: '0.333',
                } }, leaf.placeholder),
            children));
    }
    // COMPAT: Having the `data-` attributes on these leaf elements ensures that
    // in certain misbehaving browsers they aren't weirdly cloned/destroyed by
    // contenteditable behaviors. (2019/05/08)
    const attributes = {
        'data-slate-leaf': true,
    };
    return renderLeaf({ attributes, children, leaf, text });
};
const MemoizedLeaf = React__default.memo(Leaf, (prev, next) => {
    return (next.parent === prev.parent &&
        next.isLast === prev.isLast &&
        next.renderLeaf === prev.renderLeaf &&
        next.text === prev.text &&
        slate.Text.matches(next.leaf, prev.leaf));
});
/**
 * The default custom leaf renderer.
 */
const DefaultLeaf = (props) => {
    const { attributes, children } = props;
    return React__default.createElement("span", Object.assign({}, attributes), children);
};

/**
 * Prevent warning on SSR by falling back to useEffect when window is not defined
 */

var useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/**
 * Text.
 */
const Text = (props) => {
    const { decorations, isLast, parent, renderLeaf, text } = props;
    const editor = useEditor();
    const ref = React.useRef(null);
    const leaves = slate.Text.decorations(text, decorations);
    const key = ReactEditor.findKey(editor, text);
    const children = [];
    for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        children.push(React__default.createElement(MemoizedLeaf, { isLast: isLast && i === leaves.length - 1, key: `${key.id}-${i}`, leaf: leaf, text: text, parent: parent, renderLeaf: renderLeaf }));
    }
    // Update element-related weak maps with the DOM element ref.
    useIsomorphicLayoutEffect(() => {
        if (ref.current) {
            KEY_TO_ELEMENT.set(key, ref.current);
            NODE_TO_ELEMENT.set(text, ref.current);
            ELEMENT_TO_NODE.set(ref.current, text);
        }
        else {
            KEY_TO_ELEMENT.delete(key);
            NODE_TO_ELEMENT.delete(text);
        }
    });
    return (React__default.createElement("span", { "data-slate-node": "text", ref: ref }, children));
};
const MemoizedText = React__default.memo(Text, (prev, next) => {
    return (next.parent === prev.parent &&
        next.isLast === prev.isLast &&
        next.renderLeaf === prev.renderLeaf &&
        next.text === prev.text);
});

/**
 * A React context for sharing the `selected` state of an element.
 */

var SelectedContext = React.createContext(false);
/**
 * Get the current `selected` state of an element.
 */

var useSelected = () => {
  return React.useContext(SelectedContext);
};

/**
 * Element.
 */
const Element = (props) => {
    const { decorate, decorations, element, renderElement = (p) => React__default.createElement(DefaultElement, Object.assign({}, p)), renderLeaf, selection, } = props;
    const ref = React.useRef(null);
    const editor = useEditor();
    const readOnly = useReadOnly();
    const isInline = editor.isInline(element);
    const key = ReactEditor.findKey(editor, element);
    let children = (React__default.createElement(Children, { decorate: decorate, decorations: decorations, node: element, renderElement: renderElement, renderLeaf: renderLeaf, selection: selection }));
    // Attributes that the developer must mix into the element in their
    // custom node renderer component.
    const attributes = {
        'data-slate-node': 'element',
        ref,
    };
    if (isInline) {
        attributes['data-slate-inline'] = true;
    }
    // If it's a block node with inline children, add the proper `dir` attribute
    // for text direction.
    if (!isInline && slate.Editor.hasInlines(editor, element)) {
        const text = slate.Node.string(element);
        const dir = getDirection(text);
        if (dir === 'rtl') {
            attributes.dir = dir;
        }
    }
    // If it's a void node, wrap the children in extra void-specific elements.
    if (slate.Editor.isVoid(editor, element)) {
        attributes['data-slate-void'] = true;
        if (!readOnly && isInline) {
            attributes.contentEditable = false;
        }
        const Tag = isInline ? 'span' : 'div';
        const [[text]] = slate.Node.texts(element);
        children = readOnly ? null : (React__default.createElement(Tag, { "data-slate-spacer": true, style: {
                height: '0',
                color: 'transparent',
                outline: 'none',
                position: 'absolute',
            } },
            React__default.createElement(MemoizedText, { decorations: [], isLast: false, parent: element, text: text })));
        NODE_TO_INDEX.set(text, 0);
        NODE_TO_PARENT.set(text, element);
    }
    // Update element-related weak maps with the DOM element ref.
    useIsomorphicLayoutEffect(() => {
        if (ref.current) {
            KEY_TO_ELEMENT.set(key, ref.current);
            NODE_TO_ELEMENT.set(element, ref.current);
            ELEMENT_TO_NODE.set(ref.current, element);
        }
        else {
            KEY_TO_ELEMENT.delete(key);
            NODE_TO_ELEMENT.delete(element);
        }
    });
    return (React__default.createElement(SelectedContext.Provider, { value: !!selection }, renderElement({ attributes, children, element })));
};
const MemoizedElement = React__default.memo(Element, (prev, next) => {
    return (prev.decorate === next.decorate &&
        prev.element === next.element &&
        prev.renderElement === next.renderElement &&
        prev.renderLeaf === next.renderLeaf &&
        isRangeListEqual(prev.decorations, next.decorations) &&
        (prev.selection === next.selection ||
            (!!prev.selection &&
                !!next.selection &&
                slate.Range.equals(prev.selection, next.selection))));
});
/**
 * The default element renderer.
 */
const DefaultElement = (props) => {
    const { attributes, children, element } = props;
    const editor = useEditor();
    const Tag = editor.isInline(element) ? 'span' : 'div';
    return (React__default.createElement(Tag, Object.assign({}, attributes, { style: { position: 'relative' } }), children));
};
/**
 * Check if a list of ranges is equal to another.
 *
 * PERF: this requires the two lists to also have the ranges inside them in the
 * same order, but this is an okay constraint for us since decorations are
 * kept in order, and the odd case where they aren't is okay to re-render for.
 */
const isRangeListEqual = (list, another) => {
    if (list.length !== another.length) {
        return false;
    }
    for (let i = 0; i < list.length; i++) {
        const range = list[i];
        const other = another[i];
        if (!slate.Range.equals(range, other)) {
            return false;
        }
    }
    return true;
};

/**
 * A React context for sharing the editor object.
 */
const EditorContext = React.createContext(null);
/**
 * Get the current editor object from the React context.
 */
const useEditor = () => {
    const editor = React.useContext(EditorContext);
    if (!editor) {
        throw new Error(`The \`useEditor\` hook must be used inside the <Slate> component's context.`);
    }
    return editor;
};

/**
 * Children.
 */
const Children = (props) => {
    const { decorate, decorations, node, renderElement, renderLeaf, selection, } = props;
    const editor = useEditor();
    const path = ReactEditor.findPath(editor, node);
    const children = [];
    const isLeafBlock = slate.Element.isElement(node) &&
        !editor.isInline(node) &&
        slate.Editor.hasInlines(editor, node);
    for (let i = 0; i < node.children.length; i++) {
        const p = path.concat(i);
        const n = node.children[i];
        const key = ReactEditor.findKey(editor, n);
        const range = slate.Editor.range(editor, p);
        const sel = selection && slate.Range.intersection(range, selection);
        const ds = decorate([n, p]);
        for (const dec of decorations) {
            const d = slate.Range.intersection(dec, range);
            if (d) {
                ds.push(d);
            }
        }
        if (slate.Element.isElement(n)) {
            children.push(React__default.createElement(MemoizedElement, { decorate: decorate, decorations: ds, element: n, key: key.id, renderElement: renderElement, renderLeaf: renderLeaf, selection: sel }));
        }
        else {
            children.push(React__default.createElement(MemoizedText, { decorations: ds, key: key.id, isLast: isLeafBlock && i === node.children.length - 1, parent: node, renderLeaf: renderLeaf, text: n }));
        }
        NODE_TO_INDEX.set(n, i);
        NODE_TO_PARENT.set(n, node);
    }
    return React__default.createElement(React__default.Fragment, null, children);
};

var IS_IOS = typeof navigator !== 'undefined' && typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
var IS_APPLE = typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent);
var IS_FIREFOX = typeof navigator !== 'undefined' && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
var IS_SAFARI = typeof navigator !== 'undefined' && /Version\/[\d\.]+.*Safari/.test(navigator.userAgent);

/**
 * Hotkey mappings for each platform.
 */

var HOTKEYS = {
  bold: 'mod+b',
  compose: ['down', 'left', 'right', 'up', 'backspace', 'enter'],
  moveBackward: 'left',
  moveForward: 'right',
  moveWordBackward: 'ctrl+left',
  moveWordForward: 'ctrl+right',
  deleteBackward: 'shift?+backspace',
  deleteForward: 'shift?+delete',
  extendBackward: 'shift+left',
  extendForward: 'shift+right',
  italic: 'mod+i',
  splitBlock: 'shift?+enter',
  undo: 'mod+z'
};
var APPLE_HOTKEYS = {
  moveLineBackward: 'opt+up',
  moveLineForward: 'opt+down',
  moveWordBackward: 'opt+left',
  moveWordForward: 'opt+right',
  deleteBackward: ['ctrl+backspace', 'ctrl+h'],
  deleteForward: ['ctrl+delete', 'ctrl+d'],
  deleteLineBackward: 'cmd+shift?+backspace',
  deleteLineForward: ['cmd+shift?+delete', 'ctrl+k'],
  deleteWordBackward: 'opt+shift?+backspace',
  deleteWordForward: 'opt+shift?+delete',
  extendLineBackward: 'opt+shift+up',
  extendLineForward: 'opt+shift+down',
  redo: 'cmd+shift+z',
  transposeCharacter: 'ctrl+t'
};
var WINDOWS_HOTKEYS = {
  deleteWordBackward: 'ctrl+shift?+backspace',
  deleteWordForward: 'ctrl+shift?+delete',
  redo: ['ctrl+y', 'ctrl+shift+z']
};
/**
 * Create a platform-aware hotkey checker.
 */

var create = key => {
  var generic = HOTKEYS[key];
  var apple = APPLE_HOTKEYS[key];
  var windows = WINDOWS_HOTKEYS[key];
  var isGeneric = generic && isHotkey.isKeyHotkey(generic);
  var isApple = apple && isHotkey.isKeyHotkey(apple);
  var isWindows = windows && isHotkey.isKeyHotkey(windows);
  return event => {
    if (isGeneric && isGeneric(event)) return true;
    if (IS_APPLE && isApple && isApple(event)) return true;
    if (!IS_APPLE && isWindows && isWindows(event)) return true;
    return false;
  };
};
/**
 * Hotkeys.
 */


var Hotkeys = {
  isBold: create('bold'),
  isCompose: create('compose'),
  isMoveBackward: create('moveBackward'),
  isMoveForward: create('moveForward'),
  isDeleteBackward: create('deleteBackward'),
  isDeleteForward: create('deleteForward'),
  isDeleteLineBackward: create('deleteLineBackward'),
  isDeleteLineForward: create('deleteLineForward'),
  isDeleteWordBackward: create('deleteWordBackward'),
  isDeleteWordForward: create('deleteWordForward'),
  isExtendBackward: create('extendBackward'),
  isExtendForward: create('extendForward'),
  isExtendLineBackward: create('extendLineBackward'),
  isExtendLineForward: create('extendLineForward'),
  isItalic: create('italic'),
  isMoveLineBackward: create('moveLineBackward'),
  isMoveLineForward: create('moveLineForward'),
  isMoveWordBackward: create('moveWordBackward'),
  isMoveWordForward: create('moveWordForward'),
  isRedo: create('redo'),
  isSplitBlock: create('splitBlock'),
  isTransposeCharacter: create('transposeCharacter'),
  isUndo: create('undo')
};

/**
 * A React context for sharing the `readOnly` state of the editor.
 */

var ReadOnlyContext = React.createContext(false);
/**
 * Get the current `readOnly` state of the editor.
 */

var useReadOnly = () => {
  return React.useContext(ReadOnlyContext);
};

/**
 * A React context for sharing the editor object, in a way that re-renders the
 * context whenever changes occur.
 */
const SlateContext = React.createContext(null);
/**
 * Get the current editor object from the React context.
 */
const useSlate = () => {
    const context = React.useContext(SlateContext);
    if (!context) {
        throw new Error(`The \`useSlate\` hook must be used inside the <SlateProvider> component's context.`);
    }
    const [editor] = context;
    return editor;
};

/**
 * Types.
 */
/**
 * Check if a DOM node is a comment node.
 */

var isDOMComment = value => {
  return isDOMNode(value) && value.nodeType === 8;
};
/**
 * Check if a DOM node is an element node.
 */

var isDOMElement = value => {
  return isDOMNode(value) && value.nodeType === 1;
};
/**
 * Check if a value is a DOM node.
 */

var isDOMNode = value => {
  return value instanceof Node;
};
/**
 * Check if a DOM node is an element node.
 */

var isDOMText = value => {
  return isDOMNode(value) && value.nodeType === 3;
};
/**
 * Normalize a DOM point so that it always refers to a text node.
 */

var normalizeDOMPoint = domPoint => {
  var [node, offset] = domPoint; // If it's an element node, its offset refers to the index of its children
  // including comment nodes, so try to find the right text child node.

  if (isDOMElement(node) && node.childNodes.length) {
    var isLast = offset === node.childNodes.length;
    var direction = isLast ? 'backward' : 'forward';
    var index = isLast ? offset - 1 : offset;
    node = getEditableChild(node, index, direction); // If the node has children, traverse until we have a leaf node. Leaf nodes
    // can be either text nodes, or other void DOM nodes.

    while (isDOMElement(node) && node.childNodes.length) {
      var i = isLast ? node.childNodes.length - 1 : 0;
      node = getEditableChild(node, i, direction);
    } // Determine the new offset inside the text node.


    offset = isLast && node.textContent != null ? node.textContent.length : 0;
  } // Return the node and offset.


  return [node, offset];
};
/**
 * Get the nearest editable child at `index` in a `parent`, preferring
 * `direction`.
 */

var getEditableChild = (parent, index, direction) => {
  var {
    childNodes
  } = parent;
  var child = childNodes[index];
  var i = index;
  var triedForward = false;
  var triedBackward = false; // While the child is a comment node, or an element node with no children,
  // keep iterating to find a sibling non-void, non-comment node.

  while (isDOMComment(child) || isDOMElement(child) && child.childNodes.length === 0 || isDOMElement(child) && child.getAttribute('contenteditable') === 'false') {
    if (triedForward && triedBackward) {
      break;
    }

    if (i >= childNodes.length) {
      triedForward = true;
      i = index - 1;
      direction = 'backward';
      continue;
    }

    if (i < 0) {
      triedBackward = true;
      i = index + 1;
      direction = 'forward';
      continue;
    }

    child = childNodes[i];
    i += direction === 'forward' ? 1 : -1;
  }

  return child;
};

/**
 * Editable.
 */
const Editable = (props) => {
    const { autoFocus, decorate = defaultDecorate, onDOMBeforeInput: propsOnDOMBeforeInput, placeholder, readOnly = false, renderElement, renderLeaf, style = {}, as: Component = 'div', ...attributes } = props;
    const editor = useSlate();
    const ref = React.useRef(null);
    // Update internal state on each render.
    IS_READ_ONLY.set(editor, readOnly);
    // Keep track of some state for the event handler logic.
    const state = React.useMemo(() => ({
        isComposing: false,
        isUpdatingSelection: false,
        latestElement: null,
    }), []);
    // Update element-related weak maps with the DOM element ref.
    useIsomorphicLayoutEffect(() => {
        if (ref.current) {
            EDITOR_TO_ELEMENT.set(editor, ref.current);
            NODE_TO_ELEMENT.set(editor, ref.current);
            ELEMENT_TO_NODE.set(ref.current, editor);
        }
        else {
            NODE_TO_ELEMENT.delete(editor);
        }
    });
    // Attach a native DOM event handler for `selectionchange`, because React's
    // built-in `onSelect` handler doesn't fire for all selection changes. It's a
    // leaky polyfill that only fires on keypresses or clicks. Instead, we want to
    // fire for any change to the selection inside the editor. (2019/11/04)
    // https://github.com/facebook/react/issues/5785
    useIsomorphicLayoutEffect(() => {
        window.document.addEventListener('selectionchange', onDOMSelectionChange);
        return () => {
            window.document.removeEventListener('selectionchange', onDOMSelectionChange);
        };
    }, []);
    // Attach a native DOM event handler for `beforeinput` events, because React's
    // built-in `onBeforeInput` is actually a leaky polyfill that doesn't expose
    // real `beforeinput` events sadly... (2019/11/04)
    // https://github.com/facebook/react/issues/11211
    useIsomorphicLayoutEffect(() => {
        if (ref.current) {
            // @ts-ignore The `beforeinput` event isn't recognized.
            ref.current.addEventListener('beforeinput', onDOMBeforeInput);
        }
        return () => {
            if (ref.current) {
                // @ts-ignore The `beforeinput` event isn't recognized.
                ref.current.removeEventListener('beforeinput', onDOMBeforeInput);
            }
        };
    }, []);
    // Whenever the editor updates, make sure the DOM selection state is in sync.
    useIsomorphicLayoutEffect(() => {
        const { selection } = editor;
        const domSelection = window.getSelection();
        if (state.isComposing || !domSelection || !ReactEditor.isFocused(editor)) {
            return;
        }
        const hasDomSelection = domSelection.type !== 'None';
        // If the DOM selection is properly unset, we're done.
        if (!selection && !hasDomSelection) {
            return;
        }
        const newDomRange = selection && ReactEditor.toDOMRange(editor, selection);
        // If the DOM selection is already correct, we're done.
        if (hasDomSelection &&
            newDomRange &&
            isRangeEqual(domSelection.getRangeAt(0), newDomRange)) {
            return;
        }
        // Otherwise the DOM selection is out of sync, so update it.
        const el = ReactEditor.toDOMNode(editor, editor);
        state.isUpdatingSelection = true;
        domSelection.removeAllRanges();
        if (newDomRange) {
            domSelection.addRange(newDomRange);
            const leafEl = newDomRange.startContainer.parentElement;
            //scrollIntoView(leafEl, { scrollMode: 'if-needed' })
        }
        setTimeout(() => {
            // COMPAT: In Firefox, it's not enough to create a range, you also need
            // to focus the contenteditable element too. (2016/11/16)
            if (newDomRange && IS_FIREFOX) {
                el.focus();
            }
            state.isUpdatingSelection = false;
        });
    });
    // The autoFocus TextareaHTMLAttribute doesn't do anything on a div, so it
    // needs to be manually focused.
    React.useEffect(() => {
        if (ref.current && autoFocus) {
            ref.current.focus();
        }
    }, [autoFocus]);
    // Listen on the native `beforeinput` event to get real "Level 2" events. This
    // is required because React's `beforeinput` is fake and never really attaches
    // to the real event sadly. (2019/11/01)
    // https://github.com/facebook/react/issues/11211
    const onDOMBeforeInput = React.useCallback((event) => {
        if (!readOnly &&
            hasEditableTarget(editor, event.target) &&
            !isDOMEventHandled(event, propsOnDOMBeforeInput)) {
            const { selection } = editor;
            const { inputType: type } = event;
            const data = event.dataTransfer || event.data || undefined;
            // These two types occur while a user is composing text and can't be
            // cancelled. Let them through and wait for the composition to end.
            if (type === 'insertCompositionText' ||
                type === 'deleteCompositionText') {
                return;
            }
            event.preventDefault();
            // COMPAT: For the deleting forward/backward input types we don't want
            // to change the selection because it is the range that will be deleted,
            // and those commands determine that for themselves.
            if (!type.startsWith('delete') || type.startsWith('deleteBy')) {
                const [targetRange] = event.getTargetRanges();
                if (targetRange) {
                    const range = ReactEditor.toSlateRange(editor, targetRange);
                    if (!selection || !slate.Range.equals(selection, range)) {
                        slate.Transforms.select(editor, range);
                    }
                }
            }
            // COMPAT: If the selection is expanded, even if the command seems like
            // a delete forward/backward command it should delete the selection.
            if (selection &&
                slate.Range.isExpanded(selection) &&
                type.startsWith('delete')) {
                slate.Editor.deleteFragment(editor);
                return;
            }
            switch (type) {
                case 'deleteByComposition':
                case 'deleteByCut':
                case 'deleteByDrag': {
                    slate.Editor.deleteFragment(editor);
                    break;
                }
                case 'deleteContent':
                case 'deleteContentForward': {
                    slate.Editor.deleteForward(editor);
                    break;
                }
                case 'deleteContentBackward': {
                    slate.Editor.deleteBackward(editor);
                    break;
                }
                case 'deleteEntireSoftLine': {
                    slate.Editor.deleteBackward(editor, { unit: 'line' });
                    slate.Editor.deleteForward(editor, { unit: 'line' });
                    break;
                }
                case 'deleteHardLineBackward': {
                    slate.Editor.deleteBackward(editor, { unit: 'block' });
                    break;
                }
                case 'deleteSoftLineBackward': {
                    slate.Editor.deleteBackward(editor, { unit: 'line' });
                    break;
                }
                case 'deleteHardLineForward': {
                    slate.Editor.deleteForward(editor, { unit: 'block' });
                    break;
                }
                case 'deleteSoftLineForward': {
                    slate.Editor.deleteForward(editor, { unit: 'line' });
                    break;
                }
                case 'deleteWordBackward': {
                    slate.Editor.deleteBackward(editor, { unit: 'word' });
                    break;
                }
                case 'deleteWordForward': {
                    slate.Editor.deleteForward(editor, { unit: 'word' });
                    break;
                }
                case 'insertLineBreak':
                case 'insertParagraph': {
                    slate.Editor.insertBreak(editor);
                    break;
                }
                case 'insertFromComposition':
                case 'insertFromDrop':
                case 'insertFromPaste':
                case 'insertFromYank':
                case 'insertReplacementText':
                case 'insertText': {
                    if (data instanceof DataTransfer) {
                        ReactEditor.insertData(editor, data);
                    }
                    else if (typeof data === 'string') {
                        slate.Editor.insertText(editor, data);
                    }
                    break;
                }
            }
        }
    }, []);
    // Listen on the native `selectionchange` event to be able to update any time
    // the selection changes. This is required because React's `onSelect` is leaky
    // and non-standard so it doesn't fire until after a selection has been
    // released. This causes issues in situations where another change happens
    // while a selection is being dragged.
    const onDOMSelectionChange = React.useCallback(debounce(() => {
        if (!readOnly && !state.isComposing && !state.isUpdatingSelection) {
            const { activeElement } = window.document;
            const el = ReactEditor.toDOMNode(editor, editor);
            const domSelection = window.getSelection();
            const domRange = domSelection &&
                domSelection.rangeCount > 0 &&
                domSelection.getRangeAt(0);
            if (activeElement === el) {
                state.latestElement = activeElement;
                IS_FOCUSED.set(editor, true);
            }
            else {
                IS_FOCUSED.delete(editor);
            }
            if (domRange &&
                hasEditableTarget(editor, domRange.startContainer) &&
                hasEditableTarget(editor, domRange.endContainer)) {
                const range = ReactEditor.toSlateRange(editor, domRange);
                slate.Transforms.select(editor, range);
            }
            else {
                slate.Transforms.deselect(editor);
            }
        }
    }, 100), []);
    const decorations = decorate([editor, []]);
    if (placeholder &&
        editor.children.length === 1 &&
        Array.from(slate.Node.texts(editor)).length === 1 &&
        slate.Node.string(editor) === '') {
        const start = slate.Editor.start(editor, []);
        decorations.push({
            [PLACEHOLDER_SYMBOL]: true,
            placeholder,
            anchor: start,
            focus: start,
        });
    }
    return (React__default.createElement(ReadOnlyContext.Provider, { value: readOnly },
        React__default.createElement(Component
        // COMPAT: The Grammarly Chrome extension works by changing the DOM
        // out from under `contenteditable` elements, which leads to weird
        // behaviors so we have to disable it like editor. (2017/04/24)
        , Object.assign({ "data-gramm": false, role: readOnly ? undefined : 'textbox' }, attributes, { 
            // COMPAT: Firefox doesn't support the `beforeinput` event, so we'd
            // have to use hacks to make these replacement-based features work.
            spellCheck: IS_FIREFOX ? undefined : attributes.spellCheck, autoCorrect: IS_FIREFOX ? undefined : attributes.autoCorrect, autoCapitalize: IS_FIREFOX ? undefined : attributes.autoCapitalize, "data-slate-editor": true, "data-slate-node": "value", contentEditable: readOnly ? undefined : true, suppressContentEditableWarning: true, ref: ref, style: {
                // Prevent the default outline styles.
                outline: 'none',
                // Preserve adjacent whitespace and new lines.
                whiteSpace: 'pre-wrap',
                // Allow words to break if they are too long.
                wordWrap: 'break-word',
                // Allow for passed-in styles to override anything.
                ...style,
            }, onBeforeInput: React.useCallback((event) => {
                // COMPAT: Firefox doesn't support the `beforeinput` event, so we
                // fall back to React's leaky polyfill instead just for it. It
                // only works for the `insertText` input type.
                if (IS_FIREFOX && !readOnly) {
                    event.preventDefault();
                    const text = event.data;
                    slate.Editor.insertText(editor, text);
                }
            }, [readOnly]), onBlur: React.useCallback((event) => {
                if (readOnly ||
                    state.isUpdatingSelection ||
                    !hasEditableTarget(editor, event.target) ||
                    isEventHandled(event, attributes.onBlur)) {
                    return;
                }
                // COMPAT: If the current `activeElement` is still the previous
                // one, this is due to the window being blurred when the tab
                // itself becomes unfocused, so we want to abort early to allow to
                // editor to stay focused when the tab becomes focused again.
                if (state.latestElement === window.document.activeElement) {
                    return;
                }
                const { relatedTarget } = event;
                const el = ReactEditor.toDOMNode(editor, editor);
                // COMPAT: The event should be ignored if the focus is returning
                // to the editor from an embedded editable element (eg. an <input>
                // element inside a void node).
                if (relatedTarget === el) {
                    return;
                }
                // COMPAT: The event should be ignored if the focus is moving from
                // the editor to inside a void node's spacer element.
                if (isDOMElement(relatedTarget) &&
                    relatedTarget.hasAttribute('data-slate-spacer')) {
                    return;
                }
                // COMPAT: The event should be ignored if the focus is moving to a
                // non- editable section of an element that isn't a void node (eg.
                // a list item of the check list example).
                if (relatedTarget != null &&
                    isDOMNode(relatedTarget) &&
                    ReactEditor.hasDOMNode(editor, relatedTarget)) {
                    const node = ReactEditor.toSlateNode(editor, relatedTarget);
                    if (slate.Element.isElement(node) && !editor.isVoid(node)) {
                        return;
                    }
                }
                IS_FOCUSED.delete(editor);
            }, [readOnly, attributes.onBlur]), onClick: React.useCallback((event) => {
                if (!readOnly &&
                    hasTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onClick) &&
                    isDOMNode(event.target)) {
                    const node = ReactEditor.toSlateNode(editor, event.target);
                    const path = ReactEditor.findPath(editor, node);
                    const start = slate.Editor.start(editor, path);
                    if (slate.Editor.void(editor, { at: start })) {
                        const range = slate.Editor.range(editor, start);
                        slate.Transforms.select(editor, range);
                    }
                }
            }, [readOnly, attributes.onClick]), onCompositionEnd: React.useCallback((event) => {
                if (hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onCompositionEnd)) {
                    state.isComposing = false;
                    // COMPAT: In Chrome, `beforeinput` events for compositions
                    // aren't correct and never fire the "insertFromComposition"
                    // type that we need. So instead, insert whenever a composition
                    // ends since it will already have been committed to the DOM.
                    if (!IS_SAFARI && !IS_FIREFOX && event.data) {
                        slate.Editor.insertText(editor, event.data);
                    }
                }
            }, [attributes.onCompositionEnd]), onCompositionStart: React.useCallback((event) => {
                if (hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onCompositionStart)) {
                    state.isComposing = true;
                }
            }, [attributes.onCompositionStart]), onCopy: React.useCallback((event) => {
                if (hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onCopy)) {
                    event.preventDefault();
                    setFragmentData(event.clipboardData, editor);
                }
            }, [attributes.onCopy]), onCut: React.useCallback((event) => {
                if (!readOnly &&
                    hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onCut)) {
                    event.preventDefault();
                    setFragmentData(event.clipboardData, editor);
                    const { selection } = editor;
                    if (selection && slate.Range.isExpanded(selection)) {
                        slate.Editor.deleteFragment(editor);
                    }
                }
            }, [readOnly, attributes.onCut]), onDragOver: React.useCallback((event) => {
                if (hasTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onDragOver)) {
                    // Only when the target is void, call `preventDefault` to signal
                    // that drops are allowed. Editable content is droppable by
                    // default, and calling `preventDefault` hides the cursor.
                    const node = ReactEditor.toSlateNode(editor, event.target);
                    if (slate.Editor.isVoid(editor, node)) {
                        event.preventDefault();
                    }
                }
            }, [attributes.onDragOver]), onDragStart: React.useCallback((event) => {
                if (hasTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onDragStart)) {
                    const node = ReactEditor.toSlateNode(editor, event.target);
                    const path = ReactEditor.findPath(editor, node);
                    const voidMatch = slate.Editor.void(editor, { at: path });
                    // If starting a drag on a void node, make sure it is selected
                    // so that it shows up in the selection's fragment.
                    if (voidMatch) {
                        const range = slate.Editor.range(editor, path);
                        slate.Transforms.select(editor, range);
                    }
                    setFragmentData(event.dataTransfer, editor);
                }
            }, [attributes.onDragStart]), onDrop: React.useCallback((event) => {
                if (hasTarget(editor, event.target) &&
                    !readOnly &&
                    !isEventHandled(event, attributes.onDrop)) {
                    // COMPAT: Firefox doesn't fire `beforeinput` events at all, and
                    // Chromium browsers don't properly fire them for files being
                    // dropped into a `contenteditable`. (2019/11/26)
                    // https://bugs.chromium.org/p/chromium/issues/detail?id=1028668
                    if (IS_FIREFOX ||
                        (!IS_SAFARI && event.dataTransfer.files.length > 0)) {
                        event.preventDefault();
                        const range = ReactEditor.findEventRange(editor, event);
                        const data = event.dataTransfer;
                        slate.Transforms.select(editor, range);
                        ReactEditor.insertData(editor, data);
                    }
                }
            }, [readOnly, attributes.onDrop]), onFocus: React.useCallback((event) => {
                if (!readOnly &&
                    !state.isUpdatingSelection &&
                    hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onFocus)) {
                    const el = ReactEditor.toDOMNode(editor, editor);
                    state.latestElement = window.document.activeElement;
                    // COMPAT: If the editor has nested editable elements, the focus
                    // can go to them. In Firefox, this must be prevented because it
                    // results in issues with keyboard navigation. (2017/03/30)
                    if (IS_FIREFOX && event.target !== el) {
                        el.focus();
                        return;
                    }
                    IS_FOCUSED.set(editor, true);
                }
            }, [readOnly, attributes.onFocus]), onKeyDown: React.useCallback((event) => {
                if (!readOnly &&
                    hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onKeyDown)) {
                    const { nativeEvent } = event;
                    const { selection } = editor;
                    // COMPAT: Since we prevent the default behavior on
                    // `beforeinput` events, the browser doesn't think there's ever
                    // any history stack to undo or redo, so we have to manage these
                    // hotkeys ourselves. (2019/11/06)
                    if (Hotkeys.isRedo(nativeEvent)) {
                        event.preventDefault();
                        if (editor.redo) {
                            editor.redo();
                        }
                        return;
                    }
                    if (Hotkeys.isUndo(nativeEvent)) {
                        event.preventDefault();
                        if (editor.undo) {
                            editor.undo();
                        }
                        return;
                    }
                    // COMPAT: Certain browsers don't handle the selection updates
                    // properly. In Chrome, the selection isn't properly extended.
                    // And in Firefox, the selection isn't properly collapsed.
                    // (2017/10/17)
                    if (Hotkeys.isMoveLineBackward(nativeEvent)) {
                        event.preventDefault();
                        slate.Transforms.move(editor, { unit: 'line', reverse: true });
                        return;
                    }
                    if (Hotkeys.isMoveLineForward(nativeEvent)) {
                        event.preventDefault();
                        slate.Transforms.move(editor, { unit: 'line' });
                        return;
                    }
                    if (Hotkeys.isExtendLineBackward(nativeEvent)) {
                        event.preventDefault();
                        slate.Transforms.move(editor, {
                            unit: 'line',
                            edge: 'focus',
                            reverse: true,
                        });
                        return;
                    }
                    if (Hotkeys.isExtendLineForward(nativeEvent)) {
                        event.preventDefault();
                        slate.Transforms.move(editor, { unit: 'line', edge: 'focus' });
                        return;
                    }
                    // COMPAT: If a void node is selected, or a zero-width text node
                    // adjacent to an inline is selected, we need to handle these
                    // hotkeys manually because browsers won't be able to skip over
                    // the void node with the zero-width space not being an empty
                    // string.
                    if (Hotkeys.isMoveBackward(nativeEvent)) {
                        event.preventDefault();
                        if (selection && slate.Range.isCollapsed(selection)) {
                            slate.Transforms.move(editor, { reverse: true });
                        }
                        else {
                            slate.Transforms.collapse(editor, { edge: 'start' });
                        }
                        return;
                    }
                    if (Hotkeys.isMoveForward(nativeEvent)) {
                        event.preventDefault();
                        if (selection && slate.Range.isCollapsed(selection)) {
                            slate.Transforms.move(editor);
                        }
                        else {
                            slate.Transforms.collapse(editor, { edge: 'end' });
                        }
                        return;
                    }
                    if (Hotkeys.isMoveWordBackward(nativeEvent)) {
                        event.preventDefault();
                        slate.Transforms.move(editor, { unit: 'word', reverse: true });
                        return;
                    }
                    if (Hotkeys.isMoveWordForward(nativeEvent)) {
                        event.preventDefault();
                        slate.Transforms.move(editor, { unit: 'word' });
                        return;
                    }
                    // COMPAT: Firefox doesn't support the `beforeinput` event, so we
                    // fall back to guessing at the input intention for hotkeys.
                    // COMPAT: In iOS, some of these hotkeys are handled in the
                    if (IS_FIREFOX) {
                        // We don't have a core behavior for these, but they change the
                        // DOM if we don't prevent them, so we have to.
                        if (Hotkeys.isBold(nativeEvent) ||
                            Hotkeys.isItalic(nativeEvent) ||
                            Hotkeys.isTransposeCharacter(nativeEvent)) {
                            event.preventDefault();
                            return;
                        }
                        if (Hotkeys.isSplitBlock(nativeEvent)) {
                            event.preventDefault();
                            slate.Editor.insertBreak(editor);
                            return;
                        }
                        if (Hotkeys.isDeleteBackward(nativeEvent)) {
                            event.preventDefault();
                            if (selection && slate.Range.isExpanded(selection)) {
                                slate.Editor.deleteFragment(editor);
                            }
                            else {
                                slate.Editor.deleteBackward(editor);
                            }
                            return;
                        }
                        if (Hotkeys.isDeleteForward(nativeEvent)) {
                            event.preventDefault();
                            if (selection && slate.Range.isExpanded(selection)) {
                                slate.Editor.deleteFragment(editor);
                            }
                            else {
                                slate.Editor.deleteForward(editor);
                            }
                            return;
                        }
                        if (Hotkeys.isDeleteLineBackward(nativeEvent)) {
                            event.preventDefault();
                            if (selection && slate.Range.isExpanded(selection)) {
                                slate.Editor.deleteFragment(editor);
                            }
                            else {
                                slate.Editor.deleteBackward(editor, { unit: 'line' });
                            }
                            return;
                        }
                        if (Hotkeys.isDeleteLineForward(nativeEvent)) {
                            event.preventDefault();
                            if (selection && slate.Range.isExpanded(selection)) {
                                slate.Editor.deleteFragment(editor);
                            }
                            else {
                                slate.Editor.deleteForward(editor, { unit: 'line' });
                            }
                            return;
                        }
                        if (Hotkeys.isDeleteWordBackward(nativeEvent)) {
                            event.preventDefault();
                            if (selection && slate.Range.isExpanded(selection)) {
                                slate.Editor.deleteFragment(editor);
                            }
                            else {
                                slate.Editor.deleteBackward(editor, { unit: 'word' });
                            }
                            return;
                        }
                        if (Hotkeys.isDeleteWordForward(nativeEvent)) {
                            event.preventDefault();
                            if (selection && slate.Range.isExpanded(selection)) {
                                slate.Editor.deleteFragment(editor);
                            }
                            else {
                                slate.Editor.deleteForward(editor, { unit: 'word' });
                            }
                            return;
                        }
                    }
                }
            }, [readOnly, attributes.onKeyDown]), onPaste: React.useCallback((event) => {
                // COMPAT: Firefox doesn't support the `beforeinput` event, so we
                // fall back to React's `onPaste` here instead.
                if (IS_FIREFOX &&
                    !readOnly &&
                    hasEditableTarget(editor, event.target) &&
                    !isEventHandled(event, attributes.onPaste)) {
                    event.preventDefault();
                    ReactEditor.insertData(editor, event.clipboardData);
                }
            }, [readOnly, attributes.onPaste]) }),
            React__default.createElement(Children, { decorate: decorate, decorations: decorations, node: editor, renderElement: renderElement, renderLeaf: renderLeaf, selection: editor.selection }))));
};
/**
 * A default memoized decorate function.
 */
const defaultDecorate = () => [];
/**
 * Check if two DOM range objects are equal.
 */
const isRangeEqual = (a, b) => {
    return ((a.startContainer === b.startContainer &&
        a.startOffset === b.startOffset &&
        a.endContainer === b.endContainer &&
        a.endOffset === b.endOffset) ||
        (a.startContainer === b.endContainer &&
            a.startOffset === b.endOffset &&
            a.endContainer === b.startContainer &&
            a.endOffset === b.startOffset));
};
/**
 * Check if the target is in the editor.
 */
const hasTarget = (editor, target) => {
    return isDOMNode(target) && ReactEditor.hasDOMNode(editor, target);
};
/**
 * Check if the target is editable and in the editor.
 */
const hasEditableTarget = (editor, target) => {
    return (isDOMNode(target) &&
        ReactEditor.hasDOMNode(editor, target, { editable: true }));
};
/**
 * Check if an event is overrided by a handler.
 */
const isEventHandled = (event, handler) => {
    if (!handler) {
        return false;
    }
    handler(event);
    return event.isDefaultPrevented() || event.isPropagationStopped();
};
/**
 * Check if a DOM event is overrided by a handler.
 */
const isDOMEventHandled = (event, handler) => {
    if (!handler) {
        return false;
    }
    handler(event);
    return event.defaultPrevented;
};
/**
 * Set the currently selected fragment to the clipboard.
 */
const setFragmentData = (dataTransfer, editor) => {
    const { selection } = editor;
    if (!selection) {
        return;
    }
    const [start, end] = slate.Range.edges(selection);
    const startVoid = slate.Editor.void(editor, { at: start.path });
    const endVoid = slate.Editor.void(editor, { at: end.path });
    if (slate.Range.isCollapsed(selection) && !startVoid) {
        return;
    }
    // Create a fake selection so that we can add a Base64-encoded copy of the
    // fragment to the HTML, to decode on future pastes.
    const domRange = ReactEditor.toDOMRange(editor, selection);
    let contents = domRange.cloneContents();
    let attach = contents.childNodes[0];
    // Make sure attach is non-empty, since empty nodes will not get copied.
    contents.childNodes.forEach(node => {
        if (node.textContent && node.textContent.trim() !== '') {
            attach = node;
        }
    });
    // COMPAT: If the end node is a void node, we need to move the end of the
    // range from the void node's spacer span, to the end of the void node's
    // content, since the spacer is before void's content in the DOM.
    if (endVoid) {
        const [voidNode] = endVoid;
        const r = domRange.cloneRange();
        const domNode = ReactEditor.toDOMNode(editor, voidNode);
        r.setEndAfter(domNode);
        contents = r.cloneContents();
    }
    // COMPAT: If the start node is a void node, we need to attach the encoded
    // fragment to the void node's content node instead of the spacer, because
    // attaching it to empty `<div>/<span>` nodes will end up having it erased by
    // most browsers. (2018/04/27)
    if (startVoid) {
        attach = contents.querySelector('[data-slate-spacer]');
    }
    // Remove any zero-width space spans from the cloned DOM so that they don't
    // show up elsewhere when pasted.
    Array.from(contents.querySelectorAll('[data-slate-zero-width]')).forEach(zw => {
        const isNewline = zw.getAttribute('data-slate-zero-width') === 'n';
        zw.textContent = isNewline ? '\n' : '';
    });
    // Set a `data-slate-fragment` attribute on a non-empty node, so it shows up
    // in the HTML, and can be used for intra-Slate pasting. If it's a text
    // node, wrap it in a `<span>` so we have something to set an attribute on.
    if (isDOMText(attach)) {
        const span = document.createElement('span');
        // COMPAT: In Chrome and Safari, if we don't add the `white-space` style
        // then leading and trailing spaces will be ignored. (2017/09/21)
        span.style.whiteSpace = 'pre';
        span.appendChild(attach);
        contents.appendChild(span);
        attach = span;
    }
    const fragment = slate.Node.fragment(editor, selection);
    const string = JSON.stringify(fragment);
    const encoded = window.btoa(encodeURIComponent(string));
    attach.setAttribute('data-slate-fragment', encoded);
    dataTransfer.setData('application/x-slate-fragment', encoded);
    // Add the content to a <div> so that we can get its inner HTML.
    const div = document.createElement('div');
    div.appendChild(contents);
    dataTransfer.setData('text/html', div.innerHTML);
    dataTransfer.setData('text/plain', getPlainText(div));
};
/**
 * Get a plaintext representation of the content of a node, accounting for block
 * elements which get a newline appended.
 */
const getPlainText = (domNode) => {
    let text = '';
    if (isDOMText(domNode) && domNode.nodeValue) {
        return domNode.nodeValue;
    }
    if (isDOMElement(domNode)) {
        for (const childNode of Array.from(domNode.childNodes)) {
            text += getPlainText(childNode);
        }
        const display = getComputedStyle(domNode).getPropertyValue('display');
        if (display === 'block' || display === 'list' || domNode.tagName === 'BR') {
            text += '\n';
        }
    }
    return text;
};

/**
 * An auto-incrementing identifier for keys.
 */
var n = 0;
/**
 * A class that keeps track of a key string. We use a full class here because we
 * want to be able to use them as keys in `WeakMap` objects.
 */

class Key {
  constructor() {
    this.id = "".concat(n++);
  }

}

var ReactEditor = {
  /**
   * Find a key for a Slate node.
   */
  findKey(editor, node) {
    var key = NODE_TO_KEY.get(node);

    if (!key) {
      key = new Key();
      NODE_TO_KEY.set(node, key);
    }

    return key;
  },

  /**
   * Find the path of Slate node.
   */
  findPath(editor, node) {
    var path = [];
    var child = node;

    while (true) {
      var parent = NODE_TO_PARENT.get(child);

      if (parent == null) {
        if (slate.Editor.isEditor(child)) {
          return path;
        } else {
          break;
        }
      }

      var i = NODE_TO_INDEX.get(child);

      if (i == null) {
        break;
      }

      path.unshift(i);
      child = parent;
    }

    throw new Error("Unable to find the path for Slate node: ".concat(JSON.stringify(node)));
  },

  /**
   * Check if the editor is focused.
   */
  isFocused(editor) {
    return !!IS_FOCUSED.get(editor);
  },

  /**
   * Check if the editor is in read-only mode.
   */
  isReadOnly(editor) {
    return !!IS_READ_ONLY.get(editor);
  },

  /**
   * Blur the editor.
   */
  blur(editor) {
    var el = ReactEditor.toDOMNode(editor, editor);
    IS_FOCUSED.set(editor, false);

    if (window.document.activeElement === el) {
      el.blur();
    }
  },

  /**
   * Focus the editor.
   */
  focus(editor) {
    var el = ReactEditor.toDOMNode(editor, editor);
    IS_FOCUSED.set(editor, true);

    if (window.document.activeElement !== el) {
      el.focus({
        preventScroll: true
      });
    }
  },

  /**
   * Deselect the editor.
   */
  deselect(editor) {
    var {
      selection
    } = editor;
    var domSelection = window.getSelection();

    if (domSelection && domSelection.rangeCount > 0) {
      domSelection.removeAllRanges();
    }

    if (selection) {
      slate.Transforms.deselect(editor);
    }
  },

  /**
   * Check if a DOM node is within the editor.
   */
  hasDOMNode(editor, target) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var {
      editable = false
    } = options;
    var el = ReactEditor.toDOMNode(editor, editor);
    var element; // COMPAT: In Firefox, reading `target.nodeType` will throw an error if
    // target is originating from an internal "restricted" element (e.g. a
    // stepper arrow on a number input). (2018/05/04)
    // https://github.com/ianstormtaylor/slate/issues/1819

    try {
      element = isDOMElement(target) ? target : target.parentElement;
    } catch (err) {
      if (!err.message.includes('Permission denied to access property "nodeType"')) {
        throw err;
      }
    }

    if (!element) {
      return false;
    }

    return element.closest("[data-slate-editor]") === el && (!editable || el.isContentEditable);
  },

  /**
   * Insert data from a `DataTransfer` into the editor.
   */
  insertData(editor, data) {
    editor.insertData(data);
  },

  /**
   * Find the native DOM element from a Slate node.
   */
  toDOMNode(editor, node) {
    var domNode = slate.Editor.isEditor(node) ? EDITOR_TO_ELEMENT.get(editor) : KEY_TO_ELEMENT.get(ReactEditor.findKey(editor, node));

    if (!domNode) {
      throw new Error("Cannot resolve a DOM node from Slate node: ".concat(JSON.stringify(node)));
    }

    return domNode;
  },

  /**
   * Find a native DOM selection point from a Slate point.
   */
  toDOMPoint(editor, point) {
    var [node] = slate.Editor.node(editor, point.path);
    var el = ReactEditor.toDOMNode(editor, node);
    var domPoint; // If we're inside a void node, force the offset to 0, otherwise the zero
    // width spacing character will result in an incorrect offset of 1

    if (slate.Editor.void(editor, {
      at: point
    })) {
      point = {
        path: point.path,
        offset: 0
      };
    } // For each leaf, we need to isolate its content, which means filtering
    // to its direct text and zero-width spans. (We have to filter out any
    // other siblings that may have been rendered alongside them.)


    var selector = "[data-slate-string], [data-slate-zero-width]";
    var texts = Array.from(el.querySelectorAll(selector));
    var start = 0;

    for (var text of texts) {
      var domNode = text.childNodes[0];

      if (domNode == null || domNode.textContent == null) {
        continue;
      }

      var {
        length
      } = domNode.textContent;
      var attr = text.getAttribute('data-slate-length');
      var trueLength = attr == null ? length : parseInt(attr, 10);
      var end = start + trueLength;

      if (point.offset <= end) {
        var offset = Math.min(length, Math.max(0, point.offset - start));
        domPoint = [domNode, offset];
        break;
      }

      start = end;
    }

    if (!domPoint) {
      throw new Error("Cannot resolve a DOM point from Slate point: ".concat(JSON.stringify(point)));
    }

    return domPoint;
  },

  /**
   * Find a native DOM range from a Slate `range`.
   */
  toDOMRange(editor, range) {
    var {
      anchor,
      focus
    } = range;
    var domAnchor = ReactEditor.toDOMPoint(editor, anchor);
    var domFocus = slate.Range.isCollapsed(range) ? domAnchor : ReactEditor.toDOMPoint(editor, focus);
    var domRange = window.document.createRange();
    var start = slate.Range.isBackward(range) ? domFocus : domAnchor;
    var end = slate.Range.isBackward(range) ? domAnchor : domFocus;
    domRange.setStart(start[0], start[1]);
    domRange.setEnd(end[0], end[1]);
    return domRange;
  },

  /**
   * Find a Slate node from a native DOM `element`.
   */
  toSlateNode(editor, domNode) {
    var domEl = isDOMElement(domNode) ? domNode : domNode.parentElement;

    if (domEl && !domEl.hasAttribute('data-slate-node')) {
      domEl = domEl.closest("[data-slate-node]");
    }

    var node = domEl ? ELEMENT_TO_NODE.get(domEl) : null;

    if (!node) {
      throw new Error("Cannot resolve a Slate node from DOM node: ".concat(domEl));
    }

    return node;
  },

  /**
   * Get the target range from a DOM `event`.
   */
  findEventRange(editor, event) {
    if ('nativeEvent' in event) {
      event = event.nativeEvent;
    }

    var {
      clientX: x,
      clientY: y,
      target
    } = event;

    if (x == null || y == null) {
      throw new Error("Cannot resolve a Slate range from a DOM event: ".concat(event));
    }

    var node = ReactEditor.toSlateNode(editor, event.target);
    var path = ReactEditor.findPath(editor, node); // If the drop target is inside a void node, move it into either the
    // next or previous node, depending on which side the `x` and `y`
    // coordinates are closest to.

    if (slate.Editor.isVoid(editor, node)) {
      var rect = target.getBoundingClientRect();
      var isPrev = editor.isInline(node) ? x - rect.left < rect.left + rect.width - x : y - rect.top < rect.top + rect.height - y;
      var edge = slate.Editor.point(editor, path, {
        edge: isPrev ? 'start' : 'end'
      });
      var point = isPrev ? slate.Editor.before(editor, edge) : slate.Editor.after(editor, edge);

      if (point) {
        var _range = slate.Editor.range(editor, point);

        return _range;
      }
    } // Else resolve a range from the caret position where the drop occured.


    var domRange;
    var {
      document
    } = window; // COMPAT: In Firefox, `caretRangeFromPoint` doesn't exist. (2016/07/25)

    if (document.caretRangeFromPoint) {
      domRange = document.caretRangeFromPoint(x, y);
    } else {
      var position = document.caretPositionFromPoint(x, y);

      if (position) {
        domRange = document.createRange();
        domRange.setStart(position.offsetNode, position.offset);
        domRange.setEnd(position.offsetNode, position.offset);
      }
    }

    if (!domRange) {
      throw new Error("Cannot resolve a Slate range from a DOM event: ".concat(event));
    } // Resolve a Slate range from the DOM range.


    var range = ReactEditor.toSlateRange(editor, domRange);
    return range;
  },

  /**
   * Find a Slate point from a DOM selection's `domNode` and `domOffset`.
   */
  toSlatePoint(editor, domPoint) {
    var [nearestNode, nearestOffset] = normalizeDOMPoint(domPoint);
    var parentNode = nearestNode.parentNode;
    var textNode = null;
    var offset = 0;

    if (parentNode) {
      var voidNode = parentNode.closest('[data-slate-void="true"]');
      var leafNode = parentNode.closest('[data-slate-leaf]');
      var domNode = null; // Calculate how far into the text node the `nearestNode` is, so that we
      // can determine what the offset relative to the text node is.

      if (leafNode) {
        textNode = leafNode.closest('[data-slate-node="text"]');
        var range = window.document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(nearestNode, nearestOffset);
        var contents = range.cloneContents();
        var removals = [...contents.querySelectorAll('[data-slate-zero-width]'), ...contents.querySelectorAll('[contenteditable=false]')];
        removals.forEach(el => {
          el.parentNode.removeChild(el);
        }); // COMPAT: Edge has a bug where Range.prototype.toString() will
        // convert \n into \r\n. The bug causes a loop when slate-react
        // attempts to reposition its cursor to match the native position. Use
        // textContent.length instead.
        // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10291116/

        offset = contents.textContent.length;
        domNode = textNode;
      } else if (voidNode) {
        // For void nodes, the element with the offset key will be a cousin, not an
        // ancestor, so find it by going down from the nearest void parent.
        leafNode = voidNode.querySelector('[data-slate-leaf]');
        textNode = leafNode.closest('[data-slate-node="text"]');
        domNode = leafNode;
        offset = domNode.textContent.length;
      } // COMPAT: If the parent node is a Slate zero-width space, editor is
      // because the text node should have no characters. However, during IME
      // composition the ASCII characters will be prepended to the zero-width
      // space, so subtract 1 from the offset to account for the zero-width
      // space character.


      if (domNode && offset === domNode.textContent.length && parentNode.hasAttribute('data-slate-zero-width')) {
        offset--;
      }
    }

    if (!textNode) {
      throw new Error("Cannot resolve a Slate point from DOM point: ".concat(domPoint));
    } // COMPAT: If someone is clicking from one Slate editor into another,
    // the select event fires twice, once for the old editor's `element`
    // first, and then afterwards for the correct `element`. (2017/03/03)


    var slateNode = ReactEditor.toSlateNode(editor, textNode);
    var path = ReactEditor.findPath(editor, slateNode);
    return {
      path,
      offset
    };
  },

  /**
   * Find a Slate range from a DOM range or selection.
   */
  toSlateRange(editor, domRange) {
    var el = domRange instanceof Selection ? domRange.anchorNode : domRange.startContainer;
    var anchorNode;
    var anchorOffset;
    var focusNode;
    var focusOffset;
    var isCollapsed;

    if (el) {
      if (domRange instanceof Selection) {
        anchorNode = domRange.anchorNode;
        anchorOffset = domRange.anchorOffset;
        focusNode = domRange.focusNode;
        focusOffset = domRange.focusOffset;
        isCollapsed = domRange.isCollapsed;
      } else {
        anchorNode = domRange.startContainer;
        anchorOffset = domRange.startOffset;
        focusNode = domRange.endContainer;
        focusOffset = domRange.endOffset;
        isCollapsed = domRange.collapsed;
      }
    }

    if (anchorNode == null || focusNode == null || anchorOffset == null || focusOffset == null) {
      throw new Error("Cannot resolve a Slate range from DOM range: ".concat(domRange));
    }

    var anchor = ReactEditor.toSlatePoint(editor, [anchorNode, anchorOffset]);
    var focus = isCollapsed ? anchor : ReactEditor.toSlatePoint(editor, [focusNode, focusOffset]);
    return {
      anchor,
      focus
    };
  }

};

/**
 * A React context for sharing the `focused` state of the editor.
 */

var FocusedContext = React.createContext(false);
/**
 * Get the current `focused` state of the editor.
 */

var useFocused = () => {
  return React.useContext(FocusedContext);
};

/**
 * A wrapper around the provider to handle `onChange` events, because the editor
 * is a mutable singleton so it won't ever register as "changed" otherwise.
 */
const Slate = (props) => {
    const { editor, children, onChange, value, ...rest } = props;
    const [key, setKey] = React.useState(0);
    const context = React.useMemo(() => {
        editor.children = value;
        Object.assign(editor, rest);
        return [editor];
    }, [key, value, ...Object.values(rest)]);
    const onContextChange = React.useCallback(() => {
        onChange(editor.children);
        setKey(key + 1);
    }, [key, onChange]);
    EDITOR_TO_ON_CHANGE.set(editor, onContextChange);
    return (React__default.createElement(SlateContext.Provider, { value: context },
        React__default.createElement(EditorContext.Provider, { value: editor },
            React__default.createElement(FocusedContext.Provider, { value: ReactEditor.isFocused(editor) }, children))));
};

/**
 * `withReact` adds React and DOM specific behaviors to the editor.
 */

var withReact = editor => {
  var e = editor;
  var {
    apply,
    onChange
  } = e;

  e.apply = op => {
    var matches = [];

    switch (op.type) {
      case 'insert_text':
      case 'remove_text':
      case 'set_node':
        {
          for (var [node, path] of slate.Editor.levels(e, {
            at: op.path
          })) {
            var key = ReactEditor.findKey(e, node);
            matches.push([path, key]);
          }

          break;
        }

      case 'insert_node':
      case 'remove_node':
      case 'merge_node':
      case 'split_node':
        {
          for (var [_node, _path] of slate.Editor.levels(e, {
            at: slate.Path.parent(op.path)
          })) {
            var _key = ReactEditor.findKey(e, _node);

            matches.push([_path, _key]);
          }

          break;
        }
    }

    apply(op);

    for (var [_path2, _key2] of matches) {
      var [_node2] = slate.Editor.node(e, _path2);
      NODE_TO_KEY.set(_node2, _key2);
    }
  };

  e.insertData = data => {
    var fragment = data.getData('application/x-slate-fragment');

    if (fragment) {
      var decoded = decodeURIComponent(window.atob(fragment));
      var parsed = JSON.parse(decoded);
      slate.Transforms.insertFragment(e, parsed);
      return;
    }

    var text = data.getData('text/plain');

    if (text) {
      var lines = text.split('\n');
      var split = false;

      for (var line of lines) {
        if (split) {
          slate.Transforms.splitNodes(e);
        }

        slate.Transforms.insertText(e, line);
        split = true;
      }
    }
  };

  e.onChange = () => {
    // COMPAT: React doesn't batch `setState` hook calls, which means that the
    // children and selection can get out of sync for one render pass. So we
    // have to use this unstable API to ensure it batches them. (2019/12/03)
    // https://github.com/facebook/react/issues/14259#issuecomment-439702367
    ReactDOM.unstable_batchedUpdates(() => {
      var onContextChange = EDITOR_TO_ON_CHANGE.get(e);

      if (onContextChange) {
        onContextChange();
      }

      onChange();
    });
  };

  return e;
};

exports.DefaultElement = DefaultElement;
exports.DefaultLeaf = DefaultLeaf;
exports.Editable = Editable;
exports.ReactEditor = ReactEditor;
exports.Slate = Slate;
exports.useEditor = useEditor;
exports.useFocused = useFocused;
exports.useReadOnly = useReadOnly;
exports.useSelected = useSelected;
exports.useSlate = useSlate;
exports.withReact = withReact;
//# sourceMappingURL=index.js.map
