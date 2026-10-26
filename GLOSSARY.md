# Map exploration

Begrepene gjelder dette repoets fagområde. Kildegrunnlag og vedlikehold: [domenekontrakt](docs/agents/domain.md).

## Språk

**Feature**: One logical map object, which may have several geometry parts sharing the same identity.
_Unngå_: geometry part as a separate logical object.

**Selection**: The currently chosen feature in the map interface.
_Unngå_: hover.

**Viewport**: The area currently visible on the map, used to scope the result count.
_Unngå_: complete dataset.

**Explore mode**: The map experience with search, filters, result count and a default selection panel.
_Unngå_: browse mode.

**Browse mode**: The map experience for direct feature selection with a smaller interface.
_Unngå_: explore mode.

**Consumer**: The application supplying domain data, wording and visual styling to the map library.
_Unngå_: library-owned application.
