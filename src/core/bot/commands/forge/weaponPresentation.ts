import { MessageComponentTypes } from 'discordeno';

export function weaponLocationComponents(locations: unknown) {
  const names = Array.isArray(locations)
    ? [
        ...new Set(locations.filter((name): name is string => typeof name === 'string' && name.trim().length > 0)),
      ].slice(0, 25)
    : [];
  if (!names.length)
    return [
      {
        type: MessageComponentTypes.TextDisplay as const,
        content: 'Forge location is not listed for this weapon.',
      },
    ];
  return [
    {
      type: MessageComponentTypes.ActionRow as const,
      components: [
        {
          type: MessageComponentTypes.StringSelect as const,
          customId: 'weapon-location',
          placeholder: 'Obtainable From:',
          options: names.map((name, index) => ({ label: name.slice(0, 100), value: String(index) })),
        },
      ],
    },
  ];
}
