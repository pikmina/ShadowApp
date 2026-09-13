import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Tiradas Normales Header
header1_old = """                        <TableHead>Descripción</TableHead>
                      </TableRow>"""
header1_new = """                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>"""

# 2. Tiradas Normales Cell + Add Button
cell1_old = """                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>"""
cell1_new = """                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => {
                                const newNormal = [...difficulties.normal];
                                newNormal.splice(idx, 1);
                                setDifficulties({ ...difficulties, normal: newNormal });
                                setDifficultiesDirty(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setDifficulties({
                      ...difficulties,
                      normal: [...(difficulties.normal || []), { id: `rd_${Date.now()}`, name: "Nueva Dificultad", rd: 10, desc: "" }]
                    });
                    setDifficultiesDirty(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Añadir Dificultad
                </Button>"""

# 3. Tiradas Sostenidas Header
header2_old = """                        <TableHead>Descripción</TableHead>
                      </TableRow>"""
header2_new = """                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>"""

# 4. Tiradas Sostenidas Cell + Add Button
cell2_old = """                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>"""
cell2_new = """                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => {
                                const newSust = [...difficulties.sustained];
                                newSust.splice(idx, 1);
                                setDifficulties({ ...difficulties, sustained: newSust });
                                setDifficultiesDirty(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setDifficulties({
                      ...difficulties,
                      sustained: [...(difficulties.sustained || []), { id: `sust_${Date.now()}`, name: "Nuevo Reto", successes: 2, desc: "" }]
                    });
                    setDifficultiesDirty(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Añadir Dificultad Sostenida
                </Button>"""

# We need to only replace the first occurrence for header1 and second for header2, but since we modify both identically, we can do it one by one if careful, or just replace both occurrences. Let's do a strict match.
# Wait, `cell1_old` is fairly unique, but let's make sure.

content = content.replace(header1_old, header1_new)
content = content.replace(cell1_old, cell1_new, 1) # first table
content = content.replace(cell1_old, cell2_new, 1) # second table

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
