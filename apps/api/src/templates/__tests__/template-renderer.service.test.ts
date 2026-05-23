import { TemplateRendererService } from '../template-renderer.service';

describe('TemplateRendererService', () => {
  const service = new TemplateRendererService();

  it('replaces placeholders with trimmed values', () => {
    expect(
      service.renderText('Привет, {childName}!', { childName: '  Маша  ' }),
    ).toBe('Привет, Маша!');
  });

  it('uses safe fallbacks for missing variables', () => {
    expect(service.renderText('{childName} взял {favoriteToy}.', {})).toBe(
      'герой взял любимую игрушку.',
    );
  });

  it('removes unresolved unknown placeholders', () => {
    expect(service.renderText('Тайна {unknownSlot} ждала.', {})).toBe(
      'Тайна  ждала.',
    );
  });

  it('normalizes unsafe placeholder values', () => {
    expect(
      service.renderText('Герой: {heroName}.', { heroName: ' <Саша>{}' }),
    ).toBe('Герой: Саша.');
  });
});
