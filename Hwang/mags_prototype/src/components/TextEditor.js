import React, { useState, useRef, useEffect } from 'react';
import { Editor, EditorState, RichUtils, Modifier } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { Box, Button, Paper, List, ListItem, ListItemText, Toolbar, IconButton, Typography } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import styles from './TextEditor.module.css';

const TextEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [selectedText, setSelectedText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const editorContainerRef = useRef(null);
  const transformButtonRef = useRef(null);

  const handleTransform = async () => {
    if (!selectedText) {
      alert('텍스트를 선택해주세요.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/transform', {  // Flask 서버 주소
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: selectedText }),  // 선택한 텍스트를 JSON 형식으로 보냄
      });
      const result = await response.json();
      const transformedTexts = result.generated_texts;

      setSuggestions(transformedTexts);
      setShowResults(true);

      // Set popup position based on the transform button's position
      const rect = transformButtonRef.current.getBoundingClientRect();
      const popupTop = rect.top + window.scrollY;
      const popupLeft = rect.left + window.scrollX - (rect.width / 2);

      setPopupPosition({ top: popupTop, left: popupLeft });
    } catch (error) {
      console.error('Error transforming text:', error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const contentState = editorState.getCurrentContent();
    const selectionState = editorState.getSelection();
    const contentStateWithText = Modifier.replaceText(
      contentState,
      selectionState,
      suggestion,
      editorState.getCurrentInlineStyle()
    );
    const newEditorState = EditorState.push(editorState, contentStateWithText, 'insert-characters');
    setEditorState(newEditorState);
    setShowResults(false);
    setSelectedText('');
  };

  const handleSelectText = () => {
    const selectionState = editorState.getSelection();
    const anchorKey = selectionState.getAnchorKey();
    const currentContent = editorState.getCurrentContent();
    const currentContentBlock = currentContent.getBlockForKey(anchorKey);
    const start = selectionState.getStartOffset();
    const end = selectionState.getEndOffset();
    const selectedText = currentContentBlock.getText().slice(start, end);

    setSelectedText(selectedText);
  };

  const onEditorStateChange = (newState) => {
    setEditorState(newState);
    handleSelectText();
  };

  const handleKeyCommand = (command) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const applyStyle = (style) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  const applyBlockType = (blockType) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };

  const addLink = () => {
    const selection = editorState.getSelection();
    const url = window.prompt('Enter the URL');
    if (!url) return;
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity('LINK', 'MUTABLE', { url });
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const contentStateWithLink = Modifier.applyEntity(contentState, selection, entityKey);
    setEditorState(EditorState.push(editorState, contentStateWithLink, 'apply-entity'));
  };

  return (
    <Box className={styles.editorContainer} ref={editorContainerRef}>
      <div className={styles.logoContainer}>
        <Typography variant="h4" className={styles.logo}>
          MAGS
        </Typography>
      </div>
      <Toolbar className={styles.toolbar}>
        <IconButton onClick={() => applyStyle('BOLD')}>
          <FormatBoldIcon />
        </IconButton>
        <IconButton onClick={() => applyStyle('ITALIC')}>
          <FormatItalicIcon />
        </IconButton>
        <IconButton onClick={() => applyStyle('UNDERLINE')}>
          <FormatUnderlinedIcon />
        </IconButton>
        <Button ref={transformButtonRef} onClick={handleTransform} className={styles.transformButton}>
          변환하기
        </Button>
      </Toolbar>
      <div
        className={styles.editor}
        onClick={() => editorContainerRef.current.focus()}
      >
        <Editor
          editorState={editorState}
          onChange={onEditorStateChange}
          handleKeyCommand={handleKeyCommand}
        />
      </div>
      {showResults && (
        <Paper
          className={styles.popup}
          style={{
            top: popupPosition.top,
            left: popupPosition.left,
          }}
        >
          <List className={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => (
              <ListItem
                button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={styles.suggestionsListItem}
              >
                <ListItemText primary={suggestion} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default TextEditor;
