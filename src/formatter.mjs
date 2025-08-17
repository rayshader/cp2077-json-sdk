export function formatCPP(node, indent) {
    const pad = padding(indent);
    let code = '';

    switch (node.type) {
        case 'namespace': {
            code += `${pad}namespace ${node.name} {\n`;
            for (const child of node.children) {
                code += formatCPP(child, indent + 2);
            }
            code += `${pad}}\n`;
            break;
        }
        case 'enum': {
            code += `${pad}enum class ${node.name} `;
            if (node.base !== undefined) {
                code += `: ${node.base} `;
            }
            code += `{\n`;

            const padValue = padding(indent + 2);
            code += node.values
                .map((value) => {
                    if (value.value === undefined) {
                        return `${padValue}${value.name}`;
                    }
                    return `${padValue}${value.name} = ${value.value}`;
                })
                .join(',\n');
            code += '\n';

            code += `${pad}};\n`;
            break;
        }
        case 'class':
        case 'struct': {
            if (node.templates) {
                code += `${pad}template`;
                code += `<`;
                code += node.templates
                    .map((template) => {
                        if (template.type === undefined) {
                            return `typename ${template.name}`;
                        }
                        return `${template.type} ${template.name}`;
                    })
                    .join(', ');
                code += `>\n`;
            }
            code += `${pad}${node.type} ${node.name} `;
            if (node.inherit) {
                code += `: `;
                if (node.inherit.visibility) {
                    code += `${node.inherit.visibility} `;
                }
                if (node.inherit.namespaces) {
                    code += node.inherit.namespaces.join('::');
                    code += '::';
                }
                code += `${node.inherit.name}`;
                if (node.inherit.templates) {
                    code += '<';
                    code += node.inherit.templates.map((template) => template.name).join(', ');
                    code += '>';
                }
                code += ' ';
            }
            code += `{\n`;

            for (const child of node.nested) {
                code += formatCPP(child, indent + 2);
            }

            for (const field of node.fields) {
                code += formatCPP({type: 'field', node: field}, indent + 2);
            }
            code += `${pad}};\n`;
            break;
        }
        case 'field': {
            node = node.node;
            code += `${pad}${formatCPP({type: 'type', node: node.type}, 0)} `;
            code += node.name;

            if (node.type.bitfield !== undefined) {
                code += ` : ${node.type.bitfield}`;
            }

            if (node.type.fixedArray !== undefined) {
                let isConstant = Number.isNaN(parseInt(node.type.fixedArray));
                if (isConstant) {
                    code += `[${node.type.fixedArray}]`;
                } else {
                    code += `[0x${node.type.fixedArray.toString(16).toUpperCase()}]`;
                }
            }

            if (node.default !== undefined) {
                code += ` = ${node.default}`;
            }

            code += ';';

            if (node.offset !== undefined) {
                code += ` // ${node.offset.toString(16).toUpperCase()}`;
            }

            code += '\n';

            break;
        }
        case 'type': {
            node = node.node;
            if (node.static)    code += 'static ';
            if (node.constexpr) code += 'constexpr ';
            if (node.const)     code += 'const ';
            if (node.volatile)  code += 'volatile ';

            if (node.namespaces) {
                code += node.namespaces.join('::');
                code += '::';
            }
            code += node.name;

            if (node.templates) {
                code += '<';
                code += node.templates.map((template) => formatCPP({type: 'type', node: template})).join(', ');
                code += '>';
            }

            if (node.ptr) code += '*';
            if (node.ref) code += '&';

            break;
        }
    }
    return code;
}

function padding(length) {
    return ' '.repeat(length);
}
