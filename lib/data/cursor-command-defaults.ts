/**
 * Cursor Command Defaults
 * Language-specific voice commands for cursor navigation and selection
 */

export interface CursorCommand {
  name: string;
  voicePhrases: string[];
  description?: string;
}

export interface CursorCommandSet {
  navigation: {
    next: CursorCommand;
    previous: CursorCommand;
  };
  selection: {
    select: CursorCommand;
    selectAll: CursorCommand;
    selectStart: CursorCommand;
    selectEnd: CursorCommand;
  };
  cursorSize: {
    big: CursorCommand; // paragraph
    medium: CursorCommand; // word
    small: CursorCommand; // character
  };
}

// English (en-US) Cursor Commands
export const englishCursorCommands: CursorCommandSet = {
  navigation: {
    next: {
      name: 'next',
      voicePhrases: ['next', 'forward', 'continue', 'move forward'],
      description: 'Move cursor to next unit',
    },
    previous: {
      name: 'previous',
      voicePhrases: ['back', 'previous', 'go back', 'return'],
      description: 'Move cursor to previous unit',
    },
  },
  selection: {
    select: {
      name: 'select',
      voicePhrases: ['select', 'select start', 'start selecting'],
      description: 'Start selection at current cursor',
    },
    selectAll: {
      name: 'select all',
      voicePhrases: ['select all', 'select document', 'select everything'],
      description: 'Select entire document',
    },
    selectStart: {
      name: 'select start',
      voicePhrases: ['select start', 'select on'],
      description: 'Start or continue selection',
    },
    selectEnd: {
      name: 'select end',
      voicePhrases: ['select end', 'select stop'],
      description: 'End current selection',
    },
  },
  cursorSize: {
    big: {
      name: 'big',
      voicePhrases: ['big', 'paragraph', 'large'],
      description: 'Set cursor size to paragraph',
    },
    medium: {
      name: 'medium',
      voicePhrases: ['medium', 'word'],
      description: 'Set cursor size to word',
    },
    small: {
      name: 'small',
      voicePhrases: ['small', 'character', 'char'],
      description: 'Set cursor size to character',
    },
  },
};

// Finnish (fi-FI) Cursor Commands
export const finnishCursorCommands: CursorCommandSet = {
  navigation: {
    next: {
      name: 'next',
      voicePhrases: ['seuraava', 'eteenpäin', 'jatka', 'siirrä eteenpäin'],
      description: 'Siirrä kursori seuraavaan yksikköön',
    },
    previous: {
      name: 'previous',
      voicePhrases: ['takaisin', 'edellinen', 'mene taaksepäin', 'palaa'],
      description: 'Siirrä kursori edelliseen yksikköön',
    },
  },
  selection: {
    select: {
      name: 'select',
      voicePhrases: ['valitse', 'aloita valinta'],
      description: 'Aloita valinta nykyisestä kursorin paikasta',
    },
    selectAll: {
      name: 'select all',
      voicePhrases: ['valitse kaikki', 'valitse dokumentti'],
      description: 'Valitse koko dokumentti',
    },
    selectStart: {
      name: 'select start',
      voicePhrases: ['valinta alkaa', 'valinta päälle'],
      description: 'Aloita tai jatka valinnan tekemistä',
    },
    selectEnd: {
      name: 'select end',
      voicePhrases: ['valinta loppu', 'valinta lopeta'],
      description: 'Lopeta nykyinen valinta',
    },
  },
  cursorSize: {
    big: {
      name: 'big',
      voicePhrases: ['iso', 'kappale', 'suuri'],
      description: 'Aseta kursori isoksi (kappale)',
    },
    medium: {
      name: 'medium',
      voicePhrases: ['keskisuuri', 'sana'],
      description: 'Aseta kursori keskikokoiseksi (sana)',
    },
    small: {
      name: 'small',
      voicePhrases: ['pieni', 'merkki', 'kirjain'],
      description: 'Aseta kursori pieneksi (merkki)',
    },
  },
};

// Swedish (sv-SE) Cursor Commands
export const swedishCursorCommands: CursorCommandSet = {
  navigation: {
    next: {
      name: 'next',
      voicePhrases: ['nästa', 'framåt', 'fortsätt', 'flytta framåt'],
      description: 'Flytta markör till nästa enhet',
    },
    previous: {
      name: 'previous',
      voicePhrases: ['bakåt', 'föregående', 'gå tillbaka', 'återgå'],
      description: 'Flytta markör till föregående enhet',
    },
  },
  selection: {
    select: {
      name: 'select',
      voicePhrases: ['markera', 'starta markering'],
      description: 'Starta markering vid aktuell markörposition',
    },
    selectAll: {
      name: 'select all',
      voicePhrases: ['markera allt', 'markera dokument'],
      description: 'Markera hela dokumentet',
    },
    selectStart: {
      name: 'select start',
      voicePhrases: ['markering börjar', 'markering på'],
      description: 'Starta eller fortsätt markering',
    },
    selectEnd: {
      name: 'select end',
      voicePhrases: ['markering slut', 'markering stopp'],
      description: 'Avsluta aktuell markering',
    },
  },
  cursorSize: {
    big: {
      name: 'big',
      voicePhrases: ['stor', 'stycke', 'större'],
      description: 'Ställ in markörens storlek på stort (stycke)',
    },
    medium: {
      name: 'medium',
      voicePhrases: ['medel', 'ord'],
      description: 'Ställ in markörens storlek på medel (ord)',
    },
    small: {
      name: 'small',
      voicePhrases: ['liten', 'tecken', 'bokstav'],
      description: 'Ställ in markörens storlek på litet (tecken)',
    },
  },
};

/**
 * Get cursor commands for a specific language
 */
export function getCursorCommandsForLanguage(language: string): CursorCommandSet {
  switch (language.toLowerCase()) {
    case 'fi':
    case 'fi-fi':
    case 'finnish':
      return finnishCursorCommands;
    case 'sv':
    case 'sv-se':
    case 'swedish':
      return swedishCursorCommands;
    case 'en':
    case 'en-us':
    case 'english':
    default:
      return englishCursorCommands;
  }
}

/**
 * Flatten cursor commands for parsing
 */
export function flattenCursorCommands(commandSet: CursorCommandSet): Record<string, string> {
  const flattened: Record<string, string> = {};

  // Navigation
  commandSet.navigation.next.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'next';
  });
  commandSet.navigation.previous.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'previous';
  });

  // Selection
  commandSet.selection.select.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'select';
  });
  commandSet.selection.selectAll.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'selectAll';
  });
  commandSet.selection.selectStart.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'selectStart';
  });
  commandSet.selection.selectEnd.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'selectEnd';
  });

  // Cursor Size
  commandSet.cursorSize.big.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'cursorBig';
  });
  commandSet.cursorSize.medium.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'cursorMedium';
  });
  commandSet.cursorSize.small.voicePhrases.forEach((phrase) => {
    flattened[phrase.toLowerCase()] = 'cursorSmall';
  });

  return flattened;
}
