import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { YooptaContentValue } from '@yoopta/editor';

// Register fonts (using standard fonts for now, custom fonts might be needed for CS characters)
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
});

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Roboto',
        fontSize: 11,
    },
    section: {
        marginBottom: 10,
    },
    heading1: {
        fontSize: 24,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    heading2: {
        fontSize: 18,
        marginTop: 15,
        marginBottom: 8,
        fontWeight: 'bold',
        borderBottom: '1px solid #ccc',
        paddingBottom: 4,
    },
    heading3: {
        fontSize: 14,
        marginTop: 10,
        marginBottom: 6,
        fontWeight: 'bold',
    },
    paragraph: {
        marginBottom: 6,
        lineHeight: 1.5,
    },
    blockquote: {
        marginLeft: 10,
        paddingLeft: 10,
        borderLeft: '3px solid #ccc',
        fontStyle: 'italic',
        color: '#555',
    },
    callout: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        marginBottom: 10,
    },
    divider: {
        borderBottom: '1px solid #eee',
        marginVertical: 10,
    },
});

interface YooptaToPdfProps {
    content: YooptaContentValue;
}

export const YooptaToPdf: React.FC<YooptaToPdfProps> = ({ content }) => {
    const blocks = Object.values(content).sort((a: any, b: any) => a.meta.order - b.meta.order);

    const renderBlock = (block: any) => {
        const text = block.value?.[0]?.children?.[0]?.text || '';

        switch (block.type) {
            case 'HeadingOne':
                return <Text style={styles.heading1}>{text}</Text>;
            case 'HeadingTwo':
                return <Text style={styles.heading2}>{text}</Text>;
            case 'HeadingThree':
                return <Text style={styles.heading3}>{text}</Text>;
            case 'Paragraph':
                return <Text style={styles.paragraph}>{text}</Text>;
            case 'Blockquote':
                return <Text style={styles.blockquote}>{text}</Text>;
            case 'Callout':
                return (
                    <View style={styles.callout}>
                        <Text>{text}</Text>
                    </View>
                );
            case 'Divider':
                return <View style={styles.divider} />;
            default:
                return <Text style={styles.paragraph}>{text}</Text>;
        }
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {blocks.map((block: any) => (
                    <View key={block.id} style={styles.section}>
                        {renderBlock(block)}
                    </View>
                ))}
            </Page>
        </Document>
    );
};
