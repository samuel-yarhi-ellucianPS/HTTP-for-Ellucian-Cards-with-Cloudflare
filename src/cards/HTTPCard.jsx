import { withStyles } from '@ellucian/react-design-system/core/styles';
import { spacing40 } from '@ellucian/react-design-system/core/styles/tokens';
import {
    Typography,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    Paper
} from '@ellucian/react-design-system/core';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

const styles = () => ({
    card: {
        marginTop: 0,
        marginRight: spacing40,
        marginBottom: 0,
        marginLeft: spacing40
    },
    field: {
        marginTop: spacing40
    },
    button: {
        marginTop: spacing40
    },
    responsePaper: {
        marginTop: spacing40,
        padding: spacing40,
        maxHeight: 320, // adjust as needed
        overflow: 'auto',
        whiteSpace: 'pre-wrap'
    },
    listItemKey: {
        fontWeight: 600
    }
});

const TestExtensionCard = (props) => {
    const { classes } = props;

    const [resource, setResource] = useState('');
    const [acceptValue, setAcceptValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [rawResponse, setRawResponse] = useState('');
    const [parsedResponse, setParsedResponse] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const isDisabled = !resource.trim() || !acceptValue.trim() || loading;

    const handleSubmit = async () => {
        setLoading(true);
        setErrorMessage('');
        setRawResponse('');
        setParsedResponse(null);

        try {
            const response = await fetch(
                `https://your.worker.url.here/ethos/${resource}`,
                {
                    method: 'GET',
                    headers: {
                        Accept: acceptValue
                    }
                }
            );

            const text = await response.text();
            setRawResponse(text);

            if (!response.ok) {
                setErrorMessage(`Error ${response.status}: ${text}`);
                return;
            }

            // Try to parse JSON
            try {
                const json = JSON.parse(text);
                setParsedResponse(json);
            } catch (e) {
                // Not JSON — keep rawResponse only
                setParsedResponse(null);
            }
        } catch (error) {
            setErrorMessage(error.message || 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    // Render helpers
    const renderParsed = () => {
        if (parsedResponse == null) {
            return (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{rawResponse}</pre>
            );
        }

        // If it's an array, map each item into a ListItem with a pretty JSON snippet
        if (Array.isArray(parsedResponse)) {
            if (parsedResponse.length === 0) {
                return <Typography>No records returned.</Typography>;
            }
            return (
                <List disablePadding>
                    {parsedResponse.map((item, idx) => (
                        <ListItem key={idx} divider>
                            <ListItemText
                                primary={`Item ${idx + 1}`}
                                secondary={JSON.stringify(item, null, 2)}
                            />
                        </ListItem>
                    ))}
                </List>
            );
        }

        // If it's an object, show top-level keys
        if (typeof parsedResponse === 'object') {
            const entries = Object.entries(parsedResponse);
            return (
                <List disablePadding>
                    {entries.map(([k, v]) => (
                        <ListItem key={k} divider alignItems="flex-start">
                            <ListItemText
                                primary={<span className={classes.listItemKey}>{k}</span>}
                                secondary={typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
                            />
                        </ListItem>
                    ))}
                </List>
            );
        }

        // Fallback: show raw
        return (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{String(parsedResponse)}</pre>
        );
    };

    return (
        <div className={classes.card}>

            <TextField
                className={classes.field}
                label="Name of API / resource"
                value={resource}
                onChange={(event) => setResource(event.target.value)}
                fullWidth
            />

            <TextField
                className={classes.field}
                label="Accept header value (API version)"
                value={acceptValue}
                onChange={(event) => setAcceptValue(event.target.value)}
                fullWidth
            />

            <Button
                className={classes.button}
                onClick={handleSubmit}
                disabled={isDisabled}
            >
                {loading ? 'Loading…' : 'Send Request'}
            </Button>

            <Paper className={classes.responsePaper} elevation={2}>
                <Typography variant="subtitle1">Response</Typography>

                {loading && <Typography>Loading…</Typography>}

                {errorMessage ? (
                    <Typography color="error">{errorMessage}</Typography>
                ) : (
                    renderParsed()
                )}
            </Paper>
        </div>
    );
};

TestExtensionCard.propTypes = {
    classes: PropTypes.object.isRequired
};

export default withStyles(styles)(TestExtensionCard);
