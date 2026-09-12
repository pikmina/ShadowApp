import re

with open('src/components/character/CharacterEditor.tsx', 'r') as f:
    content = f.read()

bottom_buttons_html = """        )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Ver Ficha
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>
      </Card>
    </div>"""

content = content.replace("        )}\n          </div>\n        </div>\n      </Card>\n    </div>", bottom_buttons_html)

with open('src/components/character/CharacterEditor.tsx', 'w') as f:
    f.write(content)

